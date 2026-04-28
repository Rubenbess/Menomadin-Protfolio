-- Legal entities table (MIF, MHAG, etc.)
CREATE TABLE IF NOT EXISTS legal_entities (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  cap_table_alias text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_legal_entities"
  ON legal_entities FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Add legal_entity to investments
ALTER TABLE investments ADD COLUMN IF NOT EXISTS legal_entity text;

-- Seed default entities
INSERT INTO legal_entities (name, cap_table_alias)
VALUES
  ('MIF',  NULL),
  ('MHAG', NULL)
ON CONFLICT DO NOTHING;
