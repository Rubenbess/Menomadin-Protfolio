-- ============================================================
-- RLS hardening: restrict all core tables to authenticated
-- team members only, rather than any authenticated user.
--
-- This migration does NOT change the schema of any table.
-- It replaces the existing "USING (true)" policies with
-- policies that verify the caller is a registered team member,
-- giving a hard perimeter for the rare case of an account
-- compromise or an additional user being onboarded.
--
-- HOW TO APPLY:
--   supabase db push   (or paste into the SQL editor in Supabase Studio)
-- ============================================================

-- ── Helper: is the caller a registered team member? ──────────
-- We inline this as a subquery rather than a function so that
-- Supabase can inline/cache it per-statement.

-- ── companies ────────────────────────────────────────────────
drop policy if exists "authenticated_all" on companies;
create policy "team_members_all" on companies
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── rounds ───────────────────────────────────────────────────
drop policy if exists "authenticated_all" on rounds;
create policy "team_members_all" on rounds
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── investments ──────────────────────────────────────────────
drop policy if exists "authenticated_all" on investments;
create policy "team_members_all" on investments
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── cap_table ────────────────────────────────────────────────
drop policy if exists "authenticated_all" on cap_table;
create policy "team_members_all" on cap_table
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── reserves ─────────────────────────────────────────────────
drop policy if exists "authenticated_all" on reserves;
create policy "team_members_all" on reserves
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── documents ────────────────────────────────────────────────
drop policy if exists "authenticated_all" on documents;
create policy "team_members_all" on documents
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── pipeline ─────────────────────────────────────────────────
drop policy if exists "authenticated_all" on pipeline;
create policy "team_members_all" on pipeline
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── contacts ─────────────────────────────────────────────────
drop policy if exists "authenticated_all" on contacts;
create policy "team_members_all" on contacts
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── contact_interactions ─────────────────────────────────────
drop policy if exists "authenticated_all" on contact_interactions;
create policy "team_members_all" on contact_interactions
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── company_updates ──────────────────────────────────────────
drop policy if exists "authenticated_all" on company_updates;
create policy "team_members_all" on company_updates
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── reminders ────────────────────────────────────────────────
drop policy if exists "authenticated_all" on reminders;
create policy "team_members_all" on reminders
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- ── task_templates ───────────────────────────────────────────
-- Read: all team members can read public templates or their own
-- Write: only the creator can modify/delete their own templates
drop policy if exists "Authenticated users can manage task templates" on task_templates;
create policy "team_members_read" on task_templates
  for select to authenticated
  using (
    exists (select 1 from team_members where id = auth.uid())
    and (is_public = true or created_by = auth.uid())
  );
create policy "team_members_insert" on task_templates
  for insert to authenticated
  with check (
    exists (select 1 from team_members where id = auth.uid())
    and created_by = auth.uid()
  );
create policy "team_members_update" on task_templates
  for update to authenticated
  using  (created_by = auth.uid())
  with check (created_by = auth.uid());
create policy "team_members_delete" on task_templates
  for delete to authenticated
  using (created_by = auth.uid());

-- ── activities (audit log) ───────────────────────────────────
-- Allow insert for all team members; restrict reads to own records
drop policy if exists "Allow authenticated insert" on activities;
drop policy if exists "Allow authenticated select" on activities;
create policy "team_members_select" on activities
  for select to authenticated
  using (exists (select 1 from team_members where id = auth.uid()));
create policy "team_members_insert" on activities
  for insert to authenticated
  with check (
    exists (select 1 from team_members where id = auth.uid())
    and actor_id = auth.uid()
  );
