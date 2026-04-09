-- ============================================================
-- Team Members Table
-- Tracks all team members and their roles
-- ============================================================

-- Drop if exists (to clean up any partial previous migrations)
DROP TABLE IF EXISTS team_members CASCADE;

-- Create team_members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'associate', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint on email
ALTER TABLE team_members ADD CONSTRAINT unique_email UNIQUE (email);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can view all team members
CREATE POLICY "team_members_read" ON team_members
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can insert (admin checks enforced at app level)
CREATE POLICY "team_members_insert" ON team_members
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can update (admin checks enforced at app level)
CREATE POLICY "team_members_update" ON team_members
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can delete (admin checks enforced at app level)
CREATE POLICY "team_members_delete" ON team_members
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE team_members IS 'Team members and their roles';
