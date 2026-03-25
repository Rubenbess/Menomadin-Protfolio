-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name     TEXT NOT NULL,
  color    TEXT NOT NULL DEFAULT 'slate',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON pipeline_stages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Default stages (skip if already exist)
INSERT INTO pipeline_stages (name, color, position) VALUES
  ('Prospecting',     'slate',  0),
  ('Initial Meeting', 'blue',   1),
  ('Due Diligence',   'purple', 2),
  ('Term Sheet',      'amber',  3),
  ('Closed',          'green',  4),
  ('Passed',          'red',    5)
ON CONFLICT DO NOTHING;

-- Migrate existing pipeline entries to match stage names
UPDATE pipeline SET status = 'Prospecting'     WHERE status = 'prospecting';
UPDATE pipeline SET status = 'Initial Meeting'  WHERE status = 'initial-meeting';
UPDATE pipeline SET status = 'Due Diligence'    WHERE status = 'due-diligence';
UPDATE pipeline SET status = 'Term Sheet'       WHERE status = 'term-sheet';
UPDATE pipeline SET status = 'Closed'           WHERE status = 'closed';
UPDATE pipeline SET status = 'Passed'           WHERE status = 'passed';
