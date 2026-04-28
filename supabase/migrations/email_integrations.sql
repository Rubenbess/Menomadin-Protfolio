-- Microsoft 365 / Outlook OAuth tokens, one row per user
-- Required by:
--   • app/api/auth/microsoft/callback/route.ts (writes on connect)
--   • app/api/auth/microsoft/status/route.ts (reads to show connection state)
--   • app/api/auth/microsoft/disconnect/route.ts (deletes on disconnect)
--   • app/api/cron/scan-emails/route.ts (reads to scan inboxes)
--   • app/api/outlook/* picker routes (reads for token-refresh + Graph calls)

create table if not exists email_integrations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  email             text,
  access_token      text not null,
  refresh_token     text,
  token_expires_at  timestamptz not null,
  last_scanned_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists email_integrations_user_id_idx on email_integrations(user_id);

alter table email_integrations enable row level security;

-- Each user can only see/manage their own integration.
-- Service-role writes (callback, cron) bypass RLS so they keep working.
create policy "users manage own email integration"
  on email_integrations for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
