-- Emails attached to tasks via .eml / .msg drag-drop.
-- Stores a frozen snapshot of the email at attach time.

create table if not exists task_email_attachments (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references tasks(id) on delete cascade,
  attached_by     uuid not null references team_members(id) on delete cascade,
  attached_at     timestamptz not null default now(),

  -- Privacy: when true, only attached_by + task assignees can see the row
  is_private      boolean not null default false,

  -- Snapshot (frozen at attach time)
  subject         text,
  from_name       text,
  from_email      text,
  to_recipients   jsonb not null default '[]'::jsonb,  -- [{name, email}, ...]
  cc_recipients   jsonb not null default '[]'::jsonb,
  received_at     timestamptz,
  body_html       text,                                 -- sanitized HTML
  body_text       text,                                 -- plaintext fallback
  body_preview    text                                  -- short preview (~200 chars)
);

create index if not exists task_email_attachments_task_id_idx
  on task_email_attachments(task_id);

create index if not exists task_email_attachments_attached_by_idx
  on task_email_attachments(attached_by);

alter table task_email_attachments enable row level security;

-- SELECT: visible if (a) public, (b) you attached it, or (c) you're a task assignee
create policy "view task email attachments"
  on task_email_attachments for select to authenticated
  using (
    is_private = false
    or attached_by = auth.uid()
    or exists (
      select 1 from task_assignees
      where task_assignees.task_id = task_email_attachments.task_id
        and task_assignees.assigned_to = auth.uid()
    )
  );

-- INSERT: must attach as yourself
create policy "insert task email attachments as self"
  on task_email_attachments for insert to authenticated
  with check (attached_by = auth.uid());

-- UPDATE: only the attacher can change the row (e.g. flip privacy)
create policy "update own task email attachments"
  on task_email_attachments for update to authenticated
  using (attached_by = auth.uid())
  with check (attached_by = auth.uid());

-- DELETE: only the attacher can remove
create policy "delete own task email attachments"
  on task_email_attachments for delete to authenticated
  using (attached_by = auth.uid());
