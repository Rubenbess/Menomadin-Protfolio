-- Company health, written by the daily portfolio refresh (POST /api/sync/portfolio)
-- and shown as a badge on the companies list and company page.
-- Run this in the Supabase SQL editor.

alter table companies
  add column if not exists health text
    check (health in ('Critical', 'Watch', 'On track', 'Closing')),
  add column if not exists health_note text,
  add column if not exists health_updated_at timestamptz;
