create table if not exists deal_report_recipients (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text,
  created_at timestamptz not null default now()
);

alter table deal_report_recipients enable row level security;

create policy "Authenticated users can read recipients"
  on deal_report_recipients for select
  to authenticated using (true);

create policy "Authenticated users can add recipients"
  on deal_report_recipients for insert
  to authenticated with check (true);

create policy "Authenticated users can delete recipients"
  on deal_report_recipients for delete
  to authenticated using (true);
