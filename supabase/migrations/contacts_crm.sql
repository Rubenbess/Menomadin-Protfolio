-- Contacts CRM upgrade: contact type, relationship owner, last interaction date
-- Run this in the Supabase SQL editor

alter table contacts
  add column if not exists contact_type          text check (contact_type in ('Founder','Advisor','Co-investor','Service Provider','Other')),
  add column if not exists relationship_owner    text,
  add column if not exists last_interaction_date date;

-- Interaction log table
create table if not exists contact_interactions (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid not null references contacts(id) on delete cascade,
  date             date not null,
  interaction_type text not null check (interaction_type in ('call','meeting','email','other')),
  notes            text,
  created_at       timestamptz not null default now()
);

-- RLS: same policy pattern as contacts
alter table contact_interactions enable row level security;

-- Allow authenticated users full access (adjust to your existing RLS pattern)
create policy "Authenticated users can manage interactions"
  on contact_interactions
  for all
  to authenticated
  using (true)
  with check (true);

create index if not exists contact_interactions_contact_id_idx on contact_interactions(contact_id);
create index if not exists contact_interactions_date_idx       on contact_interactions(date desc);
