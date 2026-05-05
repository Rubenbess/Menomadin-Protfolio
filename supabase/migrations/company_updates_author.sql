-- Add author tracking to company updates
-- Run this in the Supabase SQL editor

alter table company_updates
  add column if not exists created_by text;
