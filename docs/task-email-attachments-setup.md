# Task email attachments — setup guide

This feature lets users attach Outlook emails to tasks, either by picking them from the user's inbox or by dropping `.eml` / `.msg` files. Snapshots are frozen at attach time, with a live "Open in Outlook" link when applicable.

There are two paths:

| Path | Needs Outlook OAuth? | Works after step… |
|---|---|---|
| **Drag & drop `.eml` / `.msg`** | No | 1 (DB migration) |
| **Outlook picker (search inbox)** | Yes | 3 (user clicks Connect) |

---

## Step 1 — Apply the DB migrations *(required for both paths)*

The `email_integrations` table is referenced by existing OAuth code (and the cron scanner) but **never existed in production** — that's why nothing email-related has worked. The new `task_email_attachments` table is what stores the snapshots.

In **Supabase Dashboard → SQL Editor**, paste and run each of these in order:

1. [`supabase/migrations/email_integrations.sql`](../supabase/migrations/email_integrations.sql)
2. [`supabase/migrations/task_email_attachments.sql`](../supabase/migrations/task_email_attachments.sql)

After this, drag-drop of `.eml` / `.msg` files into the **Emails** section of any task will work immediately.

---

## Step 2 — Wire up Microsoft 365 OAuth *(only for the inbox picker)*

The OAuth code paths exist (`/api/auth/microsoft/connect|callback|status|disconnect`); they need three environment variables and an Azure app registration.

### 2a. Create an Azure app registration

1. Go to **Azure Portal → App registrations → New registration**
2. Name: `Menomadin Portfolio (Outlook)`
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (multi-tenant + personal). Pick whatever matches who needs to connect.
4. Redirect URI: **Web**, set to `https://YOUR-APP-DOMAIN/api/auth/microsoft/callback`
   - For local dev, also add `http://localhost:3000/api/auth/microsoft/callback`
5. After creation, on the app's **Overview** page copy the **Application (client) ID**.
6. Go to **Certificates & secrets → Client secrets → New client secret**, copy the **Value** immediately (it's only shown once).
7. Go to **API permissions → Add a permission → Microsoft Graph → Delegated permissions**, add:
   - `offline_access`
   - `Mail.Read`
   - `User.Read`
   Then click **Grant admin consent** if you're an admin (otherwise each user will be prompted at first connect).

### 2b. Set environment variables

Add to `.env.local` (and to your Vercel / hosting environment):

```
MICROSOFT_CLIENT_ID=<the Application (client) ID from 2a.5>
MICROSOFT_CLIENT_SECRET=<the secret value from 2a.6>
NEXT_PUBLIC_APP_URL=https://YOUR-APP-DOMAIN
```

`NEXT_PUBLIC_APP_URL` must exactly match the redirect URI you registered above (no trailing slash).

Redeploy / restart so the new vars take effect.

---

## Step 3 — Each user connects Outlook once

Have every user who wants to use the picker visit:

```
/settings/email-scanner
```

…and click **Connect Outlook**. They'll be redirected to Microsoft's consent screen, accept the `Mail.Read` + `offline_access` scopes, and land back in the platform with a connected status. Refresh tokens are stored in `email_integrations`, so they don't need to reconnect on every session.

Once connected, the **Attach from Outlook** button in any task's Emails section opens a picker that searches the user's own inbox.

---

## How to use it (after setup)

Inside any task:

- **Emails** section sits below Attachments.
- Click **Attach from Outlook** to search and pick from your inbox.
- Or drop a `.eml` / `.msg` file on the dotted zone (right-click an email in Outlook → *Save as*).
- Each attached email shows: subject, sender, received date, preview, and an "Open in Outlook" link if it came from the picker.
- Toggle the lock/globe icon to flip between **Public** (anyone with task access can see) and **Private** (only the attacher and task assignees see). Only the user who attached it can change privacy or delete the row.
- Click an email to expand the full body inline.

## Privacy model

- `is_private = false` (default for the picker; opt-in for file uploads): visible to all authenticated users with task access.
- `is_private = true`: visible only to the user who attached it, plus the task's assignees (RLS policy `view task email attachments`).
- Only the attacher (`attached_by`) can update privacy, delete, or change the row.

## Files in this feature

| File | Purpose |
|---|---|
| `supabase/migrations/email_integrations.sql` | OAuth token storage |
| `supabase/migrations/task_email_attachments.sql` | Email snapshots + RLS |
| `lib/microsoft-graph.ts` | Shared MS Graph helpers (token refresh, search, fetch) |
| `lib/email-snapshot.ts` | Normalize Graph / `.eml` / `.msg` → snapshot, sanitize HTML |
| `actions/task-emails.ts` | Server actions: attach, detach, set-privacy, list |
| `app/api/outlook/search-messages/route.ts` | Picker search endpoint |
| `components/OutlookEmailPicker.tsx` | Modal with inbox search |
| `components/TaskEmailAttachmentDisplay.tsx` | List item (expand, privacy, delete) |
| `components/TaskEmailsPanel.tsx` | Section in task modal (button + drop zone + list) |
