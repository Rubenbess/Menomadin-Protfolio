-- Create activities table for comprehensive audit logging
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'investment', 'contact', 'document', 'task', 'round', 'safe')),
  entity_id UUID NOT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_activities_entity_type ON activities(entity_type);
CREATE INDEX idx_activities_entity_id ON activities(entity_id);
CREATE INDEX idx_activities_actor_id ON activities(actor_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all activities (no sensitive data in activities table)
CREATE POLICY "Users can view activities" ON activities
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: System can insert activities
CREATE POLICY "System can insert activities" ON activities
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE activities IS 'Audit trail tracking all changes to portfolio entities';
