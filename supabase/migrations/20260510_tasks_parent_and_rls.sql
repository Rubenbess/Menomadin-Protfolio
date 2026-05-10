-- ============================================================
-- Tasks: track parent_task_id column + tighten RLS
--
-- 1. Add the parent_task_id column that already exists in the
--    live DB but was never tracked in a migration. Without this
--    file the column is lost on a from-scratch rebuild and
--    actions/task-dependencies.ts breaks.
--
-- 2. Replace the permissive `USING (true)` policies on the
--    task-system tables with team-member gates that mirror
--    rls_tighten_team_members.sql for the rest of the schema.
--    Any authenticated user with a Supabase session previously
--    had full read/write to tasks; now they must also have a
--    row in team_members.
-- ============================================================

-- ── tasks.parent_task_id ─────────────────────────────────────
alter table tasks
  add column if not exists parent_task_id uuid references tasks(id) on delete set null;

create index if not exists tasks_parent_task_id_idx on tasks(parent_task_id);

-- ── tighten RLS on task-system tables ────────────────────────

drop policy if exists "Authenticated users can manage tasks" on tasks;
create policy "team_members_all" on tasks
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

drop policy if exists "Authenticated users can manage task assignees" on task_assignees;
create policy "team_members_all" on task_assignees
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

drop policy if exists "Authenticated users can manage task comments" on task_comments;
create policy "team_members_all" on task_comments
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

drop policy if exists "Authenticated users can manage task activities" on task_activities;
create policy "team_members_all" on task_activities
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

drop policy if exists "Authenticated users can manage task attachments" on task_attachments;
create policy "team_members_all" on task_attachments
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

drop policy if exists "Authenticated users can manage task labels" on task_labels;
create policy "team_members_all" on task_labels
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

drop policy if exists "Authenticated users can manage task label links" on task_label_links;
create policy "team_members_all" on task_label_links
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

drop policy if exists "Authenticated users can manage task recurrence rules" on task_recurrence_rules;
create policy "team_members_all" on task_recurrence_rules
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

drop policy if exists "Authenticated users can manage task automation rules" on task_automation_rules;
create policy "team_members_all" on task_automation_rules
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));

-- notifications: tighten to team members. The notifications table is
-- intentionally global (no user_id column), so the gate is membership only.
drop policy if exists "Authenticated users can manage notifications" on notifications;
create policy "team_members_all" on notifications
  for all to authenticated
  using  (exists (select 1 from team_members where id = auth.uid()))
  with check (exists (select 1 from team_members where id = auth.uid()));
