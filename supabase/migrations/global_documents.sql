-- Global Document Vault
-- Run this in the Supabase SQL editor

create table if not exists global_documents (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete set null,
  file_url    text not null,
  file_name   text not null,
  category    text not null check (category in (
    'Term Sheet', 'SHA', 'Investment Agreement', 'Board Minutes',
    'Financials', 'Pitch Deck', 'Legal', 'Other'
  )),
  doc_date    date,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table global_documents enable row level security;

create policy "Authenticated users can manage global documents"
  on global_documents
  for all
  to authenticated
  using (true)
  with check (true);

create index if not exists global_documents_company_id_idx  on global_documents(company_id);
create index if not exists global_documents_category_idx    on global_documents(category);
create index if not exists global_documents_created_at_idx  on global_documents(created_at desc);
