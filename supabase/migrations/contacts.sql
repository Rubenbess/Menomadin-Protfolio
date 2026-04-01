-- Contacts table
-- Run this in the Supabase SQL editor

create table if not exists contacts (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid references companies(id) on delete set null,
  name                  text not null,
  position              text,
  email                 text,
  phone                 text,
  address               text,
  linkedin_url          text,
  notes                 text,
  contact_type          text check (contact_type in ('Founder','Advisor','Co-investor','Service Provider','Other')),
  relationship_owner    text,
  last_interaction_date date,
  created_at            timestamptz not null default now()
);

-- Interaction log table
create table if not exists contact_interactions (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid not null references contacts(id) on delete cascade,
  date             date not null,
  interaction_type text not null check (interaction_type in ('call','meeting','email','other')),
  notes            text,
  created_at       timestamptz not null default now()
);

-- Enable RLS
alter table contacts enable row level security;
alter table contact_interactions enable row level security;

-- RLS policies
create policy "Authenticated users can manage contacts"
  on contacts
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage interactions"
  on contact_interactions
  for all
  to authenticated
  using (true)
  with check (true);

-- Indexes
create index if not exists contacts_company_id_idx on contacts(company_id);
create index if not exists contacts_name_idx on contacts(name);
create index if not exists contact_interactions_contact_id_idx on contact_interactions(contact_id);
create index if not exists contact_interactions_date_idx on contact_interactions(date desc);
