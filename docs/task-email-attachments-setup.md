# Task email attachments — setup

Drop a `.eml` or `.msg` onto any task and the email gets attached:
its subject, sender, recipients, date, and (sanitized) body are
snapshotted into the `task_email_attachments` table. The original
file is parsed server-side; nothing leaves the server.

## Activation

In **Supabase Dashboard → SQL Editor**, paste and run:

[`supabase/migrations/task_email_attachments.sql`](../supabase/migrations/task_email_attachments.sql)

That's it. The Emails section now appears in every task's detail
modal (between Attachments and Comments).

## Saving an Outlook email as `.eml` / `.msg`

- **Outlook desktop** (Windows): right-click the email → *Save As* → choose `.msg` (default) or `.eml`.
- **Outlook on the web**: open the email → *⋯ More actions* → *Download* (saves as `.eml`).
- **Apple Mail**: *File → Save As…* (saves as `.eml`).

Then drag the file onto the drop zone in the task's Emails section.

## How privacy works

Each attached email has a public/private toggle (lock vs. globe icon):

- **Public** (default): visible to anyone with task access.
- **Private**: visible only to the user who attached it + the task's assignees.

Only the user who attached the email can flip privacy or delete the
row. RLS enforces this at the database level.

## Files

| File | Purpose |
|---|---|
| `supabase/migrations/task_email_attachments.sql` | Schema + RLS |
| `lib/email-snapshot.ts` | Parses `.eml` / `.msg` → snapshot, sanitizes HTML |
| `actions/task-emails.ts` | Server actions: attach, detach, set-privacy, list |
| `components/TaskEmailsPanel.tsx` | Drop zone + list, embedded in task modal |
| `components/TaskEmailAttachmentDisplay.tsx` | Per-row UI (expand, privacy, delete) |
