-- Fix: Drop FK constraints that forced task_comments/activities/attachments
-- to use team_members.id instead of the Supabase auth user UUID.
-- These columns now store auth user UUIDs (auth.users.id) directly.

ALTER TABLE task_comments  DROP CONSTRAINT IF EXISTS task_comments_author_id_fkey;
ALTER TABLE task_activities DROP CONSTRAINT IF EXISTS task_activities_actor_id_fkey;
ALTER TABLE task_attachments DROP CONSTRAINT IF EXISTS task_attachments_uploaded_by_fkey;
