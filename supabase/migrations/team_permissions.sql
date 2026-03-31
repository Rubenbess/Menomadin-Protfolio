-- Team & Permissions
-- Run this in the Supabase SQL editor

-- Team members table
create table if not exists team_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null check (role in ('admin', 'associate', 'viewer')),
  color       text default '#8B5CF6',
  created_at  timestamptz not null default now()
);

-- Team invites table for pending invitations
create table if not exists team_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  role        text not null check (role in ('admin', 'associate', 'viewer')),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  invited_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

-- Add user tracking columns to existing tables
alter table companies add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table companies add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table contacts add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table contacts add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table rounds add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table investments add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table company_kpis add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table company_updates add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table pipeline add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table pipeline add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table safes add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table global_documents add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Enable RLS on team tables
alter table team_members enable row level security;
alter table team_invites enable row level security;

-- Team members can view all team members
create policy "Team members can view all team members"
  on team_members
  for select
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Only admins can manage team members
create policy "Only admins can invite users"
  on team_invites
  for insert
  to authenticated
  with check (exists (
    select 1 from team_members
    where user_id = auth.uid() and role = 'admin'
  ));

create policy "Users can view invites they created or received"
  on team_invites
  for select
  to authenticated
  using (
    invited_by = auth.uid() or email = (select email from auth.users where id = auth.uid())
  );

create policy "Only admins can update team invites"
  on team_invites
  for update
  to authenticated
  using (invited_by = auth.uid());

create policy "Only admins can delete invites"
  on team_invites
  for delete
  to authenticated
  using (exists (
    select 1 from team_members
    where user_id = auth.uid() and role = 'admin'
  ));

-- Indexes
create index if not exists team_members_user_id_idx on team_members(user_id);
create index if not exists team_members_email_idx on team_members(email);
create index if not exists team_invites_email_idx on team_invites(email);
create index if not exists team_invites_status_idx on team_invites(status);

-- Update RLS policies for existing tables to require team membership
-- Note: These policies ensure only authenticated team members can access portfolio data

-- Companies: Team members can view and edit
alter table companies enable row level security;
drop policy if exists "Authenticated users can manage companies" on companies;
create policy "Team members can view and manage companies"
  on companies
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Contacts: Team members can view and edit
alter table contacts enable row level security;
drop policy if exists "Authenticated users can manage contacts" on contacts;
create policy "Team members can view and manage contacts"
  on contacts
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Rounds: Team members can view and edit
alter table rounds enable row level security;
drop policy if exists "Authenticated users can manage rounds" on rounds;
create policy "Team members can view and manage rounds"
  on rounds
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Investments: Team members can view and edit
alter table investments enable row level security;
drop policy if exists "Authenticated users can manage investments" on investments;
create policy "Team members can view and manage investments"
  on investments
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Company KPIs: Team members can view and edit
alter table company_kpis enable row level security;
drop policy if exists "Authenticated users can manage kpis" on company_kpis;
create policy "Team members can view and manage kpis"
  on company_kpis
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Company Updates: Team members can view and edit
alter table company_updates enable row level security;
drop policy if exists "Authenticated users can manage updates" on company_updates;
create policy "Team members can view and manage updates"
  on company_updates
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Pipeline: Team members can view and edit
alter table pipeline enable row level security;
drop policy if exists "Authenticated users can manage pipeline" on pipeline;
create policy "Team members can view and manage pipeline"
  on pipeline
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- SAFEs: Team members can view and edit
alter table safes enable row level security;
drop policy if exists "Authenticated users can manage safes" on safes;
create policy "Team members can view and manage safes"
  on safes
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Global Documents: Team members can view and edit
alter table global_documents enable row level security;
drop policy if exists "Authenticated users can manage documents" on global_documents;
create policy "Team members can view and manage documents"
  on global_documents
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Notifications: Team members can view and manage
alter table notifications enable row level security;
drop policy if exists "Authenticated users can manage notifications" on notifications;
create policy "Team members can view and manage notifications"
  on notifications
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Contact Interactions: Team members can view and manage
alter table contact_interactions enable row level security;
drop policy if exists "Authenticated users can manage interactions" on contact_interactions;
create policy "Team members can view and manage interactions"
  on contact_interactions
  for all
  to authenticated
  using (exists (select 1 from team_members where user_id = auth.uid()));

-- Triggers to automatically set created_by field
create or replace function set_created_by()
  returns trigger as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$ language plpgsql security definer;

-- Create triggers for automatic created_by field
drop trigger if exists set_companies_created_by on companies;
create trigger set_companies_created_by before insert on companies
  for each row execute function set_created_by();

drop trigger if exists set_contacts_created_by on contacts;
create trigger set_contacts_created_by before insert on contacts
  for each row execute function set_created_by();

drop trigger if exists set_rounds_created_by on rounds;
create trigger set_rounds_created_by before insert on rounds
  for each row execute function set_created_by();

drop trigger if exists set_investments_created_by on investments;
create trigger set_investments_created_by before insert on investments
  for each row execute function set_created_by();

drop trigger if exists set_kpis_created_by on company_kpis;
create trigger set_kpis_created_by before insert on company_kpis
  for each row execute function set_created_by();

drop trigger if exists set_updates_created_by on company_updates;
create trigger set_updates_created_by before insert on company_updates
  for each row execute function set_created_by();

drop trigger if exists set_pipeline_created_by on pipeline;
create trigger set_pipeline_created_by before insert on pipeline
  for each row execute function set_created_by();

drop trigger if exists set_safes_created_by on safes;
create trigger set_safes_created_by before insert on safes
  for each row execute function set_created_by();

drop trigger if exists set_documents_created_by on global_documents;
create trigger set_documents_created_by before insert on global_documents
  for each row execute function set_created_by();
