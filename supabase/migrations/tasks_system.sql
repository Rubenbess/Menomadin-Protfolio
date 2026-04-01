-- Complete Tasks Management System Schema
-- Run this in the Supabase SQL editor

-- ====== MAIN TASKS TABLE ======
create table if not exists tasks (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  description           text,
  status                text not null default 'To do' check (status in ('To do', 'In progress', 'Waiting', 'Done', 'Cancelled')),
  priority              text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  created_by            uuid not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  completed_at          timestamptz,
  completed_by          uuid,
  start_date            date,
  due_date              date,
  company_id            uuid references companies(id) on delete set null,
  pipeline_deal_id      uuid references pipeline(id) on delete set null,
  contact_id            uuid references contacts(id) on delete set null,
  internal_project_id   text,
  is_recurring          boolean not null default false,
  recurrence_rule_id    uuid references task_recurrence_rules(id) on delete set null,
  template_id           uuid references task_templates(id) on delete set null
);

-- ====== TASK ASSIGNEES (Multi-user support) ======
create table if not exists task_assignees (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  assigned_to uuid not null references team_members(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid not null,
  unique(task_id, assigned_to)
);

-- ====== TASK COMMENTS & ACTIVITY ======
create table if not exists task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  author_id  uuid not null references team_members(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_activity boolean not null default false
);

-- ====== TASK ACTIVITY LOG ======
create table if not exists task_activities (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  actor_id    uuid not null references team_members(id) on delete cascade,
  action_type text not null check (action_type in ('status_changed', 'assignee_added', 'assignee_removed', 'due_date_changed', 'priority_changed', 'completed', 'cancelled')),
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now(),
  metadata    jsonb
);

-- ====== TASK ATTACHMENTS ======
create table if not exists task_attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  file_url    text not null,
  file_name   text not null,
  file_size   integer,
  uploaded_by uuid not null references team_members(id) on delete cascade,
  created_at  timestamptz not null default now(),
  metadata    jsonb
);

-- ====== TASK LABELS ======
create table if not exists task_labels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text,
  created_at timestamptz not null default now()
);

-- ====== TASK-LABEL LINKS (Many-to-many) ======
create table if not exists task_label_links (
  id       uuid primary key default gen_random_uuid(),
  task_id  uuid not null references tasks(id) on delete cascade,
  label_id uuid not null references task_labels(id) on delete cascade,
  unique(task_id, label_id)
);

-- ====== TASK TEMPLATES ======
create table if not exists task_templates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text,
  category          text check (category in ('diligence', 'ic_prep', 'legal_followup', 'portfolio_followup', 'fundraising', 'internal', 'other')),
  template_content  jsonb,
  created_by        uuid not null,
  created_at        timestamptz not null default now(),
  is_public         boolean not null default true
);

-- ====== TASK RECURRENCE RULES ======
create table if not exists task_recurrence_rules (
  id              uuid primary key default gen_random_uuid(),
  frequency       text not null check (frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  interval        integer not null default 1,
  day_of_week     integer check (day_of_week >= 0 and day_of_week <= 6),
  day_of_month    integer check (day_of_month >= 1 and day_of_month <= 31),
  next_occurrence date not null,
  last_generated  date,
  is_active       boolean not null default true,
  created_by      uuid not null,
  created_at      timestamptz not null default now(),
  metadata        jsonb
);

-- ====== TASK AUTOMATION RULES ======
create table if not exists task_automation_rules (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  trigger_type  text not null check (trigger_type in ('deal_created', 'company_created', 'task_overdue', 'task_completed')),
  action_type   text not null check (action_type in ('create_task', 'notify_team', 'assign_to')),
  config        jsonb not null,
  created_by    uuid not null,
  created_at    timestamptz not null default now(),
  is_active     boolean not null default true
);

-- ====== ENABLE RLS ======
alter table tasks enable row level security;
alter table task_assignees enable row level security;
alter table task_comments enable row level security;
alter table task_activities enable row level security;
alter table task_attachments enable row level security;
alter table task_labels enable row level security;
alter table task_label_links enable row level security;
alter table task_templates enable row level security;
alter table task_recurrence_rules enable row level security;
alter table task_automation_rules enable row level security;

-- ====== RLS POLICIES ======

-- Tasks: Authenticated users can manage tasks
create policy "Authenticated users can manage tasks"
  on tasks for all to authenticated
  using (true) with check (true);

-- Task Assignees: Authenticated users can manage assignees
create policy "Authenticated users can manage task assignees"
  on task_assignees for all to authenticated
  using (true) with check (true);

-- Task Comments: Authenticated users can manage comments
create policy "Authenticated users can manage task comments"
  on task_comments for all to authenticated
  using (true) with check (true);

-- Task Activities: Authenticated users can manage activities
create policy "Authenticated users can manage task activities"
  on task_activities for all to authenticated
  using (true) with check (true);

-- Task Attachments: Authenticated users can manage attachments
create policy "Authenticated users can manage task attachments"
  on task_attachments for all to authenticated
  using (true) with check (true);

-- Task Labels: Authenticated users can manage labels
create policy "Authenticated users can manage task labels"
  on task_labels for all to authenticated
  using (true) with check (true);

-- Task Label Links: Authenticated users can manage label links
create policy "Authenticated users can manage task label links"
  on task_label_links for all to authenticated
  using (true) with check (true);

-- Task Templates: Authenticated users can manage templates
create policy "Authenticated users can manage task templates"
  on task_templates for all to authenticated
  using (true) with check (true);

-- Task Recurrence Rules: Authenticated users can manage recurrence rules
create policy "Authenticated users can manage task recurrence rules"
  on task_recurrence_rules for all to authenticated
  using (true) with check (true);

-- Task Automation Rules: Authenticated users can manage automation rules
create policy "Authenticated users can manage task automation rules"
  on task_automation_rules for all to authenticated
  using (true) with check (true);

-- ====== INDEXES ======

-- Tasks indexes
create index if not exists tasks_status_idx on tasks(status);
create index if not exists tasks_priority_idx on tasks(priority);
create index if not exists tasks_company_id_idx on tasks(company_id);
create index if not exists tasks_pipeline_deal_id_idx on tasks(pipeline_deal_id);
create index if not exists tasks_contact_id_idx on tasks(contact_id);
create index if not exists tasks_created_by_idx on tasks(created_by);
create index if not exists tasks_due_date_idx on tasks(due_date);
create index if not exists tasks_created_at_idx on tasks(created_at desc);
create index if not exists tasks_status_due_date_idx on tasks(status, due_date);

-- Task Assignees indexes
create index if not exists task_assignees_task_id_idx on task_assignees(task_id);
create index if not exists task_assignees_assigned_to_idx on task_assignees(assigned_to);

-- Task Comments indexes
create index if not exists task_comments_task_id_idx on task_comments(task_id);
create index if not exists task_comments_author_id_idx on task_comments(author_id);

-- Task Activities indexes
create index if not exists task_activities_task_id_idx on task_activities(task_id);
create index if not exists task_activities_action_type_idx on task_activities(action_type);

-- Task Attachments indexes
create index if not exists task_attachments_task_id_idx on task_attachments(task_id);

-- Task Label Links indexes
create index if not exists task_label_links_task_id_idx on task_label_links(task_id);
create index if not exists task_label_links_label_id_idx on task_label_links(label_id);

-- Task Recurrence indexes
create index if not exists task_recurrence_rules_next_occurrence_idx on task_recurrence_rules(next_occurrence);

-- Task Automation indexes
create index if not exists task_automation_rules_trigger_type_idx on task_automation_rules(trigger_type);
create index if not exists task_automation_rules_is_active_idx on task_automation_rules(is_active);
