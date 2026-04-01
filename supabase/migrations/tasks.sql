-- Tasks management system
-- Run this in the Supabase SQL editor

-- Create tasks table
create table if not exists tasks (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  status           text not null default 'not-started'
                   check (status in ('not-started', 'in-progress', 'waiting', 'done')),
  priority         text not null default 'medium'
                   check (priority in ('high', 'medium', 'low')),
  due_date         date,
  company_id       uuid references companies(id) on delete set null,
  assignee_id      uuid references team_members(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Create task_participants junction table
create table if not exists task_participants (
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid not null references tasks(id) on delete cascade,
  team_member_id   uuid not null references team_members(id) on delete cascade,
  created_at       timestamptz not null default now(),
  unique(task_id, team_member_id)
);

-- Create team_members table if it doesn't exist
create table if not exists team_members (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  role             text,
  color            text not null default '#6366f1',
  created_at       timestamptz not null default now()
);

-- Enable RLS
alter table tasks enable row level security;
alter table task_participants enable row level security;
alter table team_members enable row level security;

-- RLS policies - allow authenticated users full access
create policy "Authenticated users can manage tasks"
  on tasks
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage task_participants"
  on task_participants
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage team_members"
  on team_members
  for all
  to authenticated
  using (true)
  with check (true);

-- Create indexes for performance
create index if not exists tasks_company_id_idx on tasks(company_id);
create index if not exists tasks_assignee_id_idx on tasks(assignee_id);
create index if not exists tasks_status_idx on tasks(status);
create index if not exists task_participants_task_id_idx on task_participants(task_id);
create index if not exists task_participants_team_member_id_idx on task_participants(team_member_id);
