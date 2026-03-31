-- Activity feed & notifications
-- Run this in the Supabase SQL editor

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in (
    'kpi_added', 'update_added', 'stage_changed', 'new_deal', 'task_overdue',
    'investment_added', 'company_added', 'safe_added', 'document_uploaded', 'general'
  )),
  title       text not null,
  body        text,
  company_id  uuid references companies(id) on delete cascade,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "Authenticated users can manage notifications"
  on notifications
  for all
  to authenticated
  using (true)
  with check (true);

create index if not exists notifications_read_idx     on notifications(read desc);
create index if not exists notifications_created_at_idx on notifications(created_at desc);
create index if not exists notifications_company_id_idx on notifications(company_id);
