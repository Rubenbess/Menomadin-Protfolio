-- ============================================================================
-- SECURITY: lock down team_members (RLS) + remove instant-admin signup
--
-- Fixes the two Critical findings from the 2026-06-18 health check:
--   M-008  team_members had NO row-level security, so the browser anon client
--          could run  update team_members set role='admin' where id=<self>
--          and self-escalate to admin. This nullified the entire RBAC model
--          (get_user_role / requireAdminAuth all read this table).
--   M-009  New users defaulted to 'admin' with open self-service signup, so any
--          internet signup became a full admin.
--
-- ⚠️  REVIEW + APPLY MANUALLY — this was authored without access to the live DB.
--     team_members is the role-authority table: get_user_role() and every core
--     RLS policy do `exists (select 1 from team_members where id = auth.uid())`,
--     so a wrong policy here can lock out the ENTIRE team. Read the assumptions
--     and run the VERIFICATION steps at the bottom before trusting it in prod.
--
-- HOW TO APPLY:
--     supabase db push          (or paste into Supabase Studio → SQL editor)
--
-- ASSUMPTIONS (verify against the live project):
--   1. team_members.id = auth.users.id (UUID), per handle_new_user_trigger.sql.
--   2. This migration runs as `postgres` (or another BYPASSRLS owner), so the
--      SECURITY DEFINER helpers below bypass RLS and do not recurse into the
--      policies they support. (Supabase SQL editor / db push satisfy this.)
--   3. There is at least one existing team member who should remain admin.
--      Existing rows are NOT modified by this migration — current admins keep
--      admin; only NEW signups change.
--
-- ROLLBACK: `alter table public.team_members disable row level security;`
--           plus drop the policies/trigger/functions created here.
-- ============================================================================

-- ── 1. Recursion-safe admin check ──────────────────────────────────────────
-- SECURITY DEFINER → runs as the function owner and bypasses RLS, so calling it
-- from inside a team_members policy/trigger does not re-trigger team_members RLS
-- (which would be infinite recursion).
create or replace function public.is_team_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── 2. Enable RLS on team_members ──────────────────────────────────────────
alter table public.team_members enable row level security;

-- Drop any prior policies so this migration is idempotent.
drop policy if exists "authenticated_all"      on public.team_members;
drop policy if exists "team_members_all"        on public.team_members;
drop policy if exists "team_members_select"     on public.team_members;
drop policy if exists "team_members_insert"     on public.team_members;
drop policy if exists "team_members_update"     on public.team_members;
drop policy if exists "team_members_delete"     on public.team_members;

-- ── 3. SELECT: any authenticated user may read team members ─────────────────
-- Required so get_user_role() and the `exists(... team_members ...)` membership
-- checks in every other table's policy keep working, and so the app can render
-- assignee / team lists. Internal-tool team rows are not sensitive to other
-- members. (Tighten to `id = auth.uid() or is_team_admin()` later if you decide
-- members should not see each other's email — but confirm the team list UI first.)
create policy "team_members_select" on public.team_members
  for select to authenticated
  using (true);

-- ── 4. INSERT: self or admin (role is forced/guarded by the trigger in §6) ──
-- Normal signup creates the row via the SECURITY DEFINER trigger handle_new_user
-- (which bypasses RLS). This policy additionally allows the app's self-heal
-- fallback (app/(protected)/layout.tsx) to insert the caller's own row. The
-- guard trigger forces any non-admin insert to role='viewer', so this cannot be
-- used to self-provision as admin.
create policy "team_members_insert" on public.team_members
  for insert to authenticated
  with check (id = auth.uid() or is_team_admin());

-- ── 5. UPDATE: self or admin; role/id changes are guarded in §6 ─────────────
-- A member may edit their own row (name, phone, etc.); admins may edit anyone.
-- The trigger blocks a non-admin from changing their own `role` or `id`.
create policy "team_members_update" on public.team_members
  for update to authenticated
  using  (id = auth.uid() or is_team_admin())
  with check (id = auth.uid() or is_team_admin());

-- ── 6. DELETE: admins only ──────────────────────────────────────────────────
create policy "team_members_delete" on public.team_members
  for delete to authenticated
  using (is_team_admin());

-- ── 7. Guard trigger: prevent privilege escalation on insert/update ─────────
-- This is the actual anti-escalation control. RLS decides WHO may write a row;
-- this decides WHAT role they may end up with.
create or replace function public.enforce_team_member_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into existing_count from public.team_members;
    -- Bootstrap: the very first member keeps whatever role was supplied
    -- (handle_new_user makes the first user 'admin' so the platform has an admin).
    if existing_count = 0 then
      return new;
    end if;
    -- Admins may onboard a member at any role; everyone else is forced to viewer.
    if not public.is_team_admin() then
      new.role := 'viewer';
    end if;
    return new;

  elsif tg_op = 'UPDATE' then
    if public.is_team_admin() then
      return new;  -- admins may change any field, including role
    end if;
    if new.role is distinct from old.role then
      raise exception 'Only an admin may change a team member role';
    end if;
    if new.id is distinct from old.id then
      raise exception 'team_members.id is immutable';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_team_member_role on public.team_members;
create trigger trg_enforce_team_member_role
  before insert or update on public.team_members
  for each row execute function public.enforce_team_member_role();

-- ── 8. Signup: least-privilege default + email-domain allowlist (M-009) ─────
-- Overrides the original handle_new_user() (handle_new_user_trigger.sql):
--   • the first ever member becomes 'admin' (bootstrap), everyone else 'viewer';
--   • only allow-listed email domains get a team_members row at all — a signup
--     from any other domain creates the auth user but NO membership row, so the
--     `exists(... team_members ...)` checks fail and they can read/write nothing.
-- EDIT `allowed_domains` to match your organisation before applying.
-- ALSO disable open signups in Supabase → Authentication → Providers if invite-
-- only onboarding is desired (defence in depth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_domains text[] := array['menomadin.com'];  -- ← adjust to your org domain(s)
  user_domain     text   := lower(split_part(new.email, '@', 2));
  member_count    integer;
  assigned_role   text;
begin
  select count(*) into member_count from public.team_members;

  -- External (non-allowlisted) signups after bootstrap get NO membership row.
  if member_count > 0 and not (user_domain = any(allowed_domains)) then
    return new;
  end if;

  assigned_role := case when member_count = 0 then 'admin' else 'viewer' end;

  insert into public.team_members (id, name, email, role, color)
  values (new.id, split_part(new.email, '@', 1), new.email, assigned_role, '#6366f1')
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ── VERIFICATION (run after applying; do NOT skip) ──────────────────────────
-- As an existing admin (normal app session):
--   1. select role from team_members where id = auth.uid();        -- expect 'admin'
--   2. update team_members set role='admin' where id=<other user>; -- expect SUCCESS
-- As a NON-admin member:
--   3. update team_members set role='admin' where id = auth.uid();
--        -- expect ERROR: "Only an admin may change a team member role"
--   4. update team_members set name='x' where id = auth.uid();     -- expect SUCCESS (self edit)
--   5. select * from companies limit 1;                            -- expect rows (read still works)
-- If step 5 returns nothing for a legitimate member, the membership check broke —
-- ROLL BACK immediately (see header) and review the SELECT policy in §3.
-- ============================================================================
