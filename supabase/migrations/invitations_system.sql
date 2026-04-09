-- ============================================================
-- Team Invitations System
-- Allows admins to invite users by email with magic links
-- ============================================================

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_role TEXT NOT NULL CHECK (invited_role IN ('admin', 'associate', 'viewer')),
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(email, status) -- Only one active invitation per email
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_created_at ON invitations(created_at DESC);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only authenticated users can view invitations
CREATE POLICY "Users can view invitations" ON invitations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Only admins can create invitations
CREATE POLICY "Admins can create invitations" ON invitations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Only admins can update invitations
CREATE POLICY "Admins can update invitations" ON invitations
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Function to accept invitation and create team member
CREATE OR REPLACE FUNCTION accept_invitation(
  p_code TEXT,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation_id UUID;
  v_invited_role TEXT;
BEGIN
  -- Find invitation by code
  SELECT id, invited_role INTO v_invitation_id, v_invited_role
  FROM invitations
  WHERE code = p_code
    AND status = 'pending'
    AND expires_at > NOW()
    AND email = p_user_email;

  IF v_invitation_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = NOW(), accepted_by = p_user_id
  WHERE id = v_invitation_id;

  -- Create team member if doesn't exist
  INSERT INTO team_members (id, name, email, role, created_at)
  VALUES (p_user_id, p_user_name, p_user_email, v_invited_role, NOW())
  ON CONFLICT (id) DO UPDATE SET role = v_invited_role;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create team member on first login (if not invited)
CREATE OR REPLACE FUNCTION auto_create_team_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Create team member if doesn't exist
  INSERT INTO team_members (id, name, email, role, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'viewer', -- Default role
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create team member on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION auto_create_team_member();

-- Add comments
COMMENT ON TABLE invitations IS 'Team member invitations with email-based magic links';
COMMENT ON FUNCTION accept_invitation(TEXT, UUID, TEXT, TEXT) IS 'Accept invitation and create/update team member';
COMMENT ON FUNCTION auto_create_team_member() IS 'Automatically create team member record on user signup with viewer role';
