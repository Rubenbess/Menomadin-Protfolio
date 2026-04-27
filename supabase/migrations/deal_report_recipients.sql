create table if not exists deal_report_recipients (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text,
  created_at timestamptz not null default now()
);
