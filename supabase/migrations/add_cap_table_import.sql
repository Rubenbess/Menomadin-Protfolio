-- Extend cap_table with richer columns
ALTER TABLE cap_table
ADD COLUMN IF NOT EXISTS holder_type TEXT,
ADD COLUMN IF NOT EXISTS security_type TEXT,
ADD COLUMN IF NOT EXISTS share_count NUMERIC,
ADD COLUMN IF NOT EXISTS investment_amount NUMERIC,
ADD COLUMN IF NOT EXISTS issue_date DATE,
ADD COLUMN IF NOT EXISTS conversion_ratio NUMERIC,
ADD COLUMN IF NOT EXISTS liquidation_preference NUMERIC,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS is_fully_diluted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS import_snapshot_id UUID;

-- Create cap table imports table
CREATE TABLE cap_table_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_url TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  detected_sheet_names TEXT[],
  parsed_row_count INTEGER NOT NULL,
  imported_row_count INTEGER DEFAULT 0,
  import_status TEXT NOT NULL DEFAULT 'uploaded',
  validation_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  imported_at TIMESTAMPTZ
);

-- Create cap table import data table
CREATE TABLE cap_table_import_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_snapshot_id UUID NOT NULL REFERENCES cap_table_imports(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  normalized_data JSONB NOT NULL,
  validation_errors TEXT[],
  validation_warnings TEXT[],
  is_imported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_cap_table_company_id ON cap_table(company_id);
CREATE INDEX idx_cap_table_import_snapshot ON cap_table(import_snapshot_id);
CREATE INDEX idx_cap_table_imports_company_id ON cap_table_imports(company_id);
CREATE INDEX idx_cap_table_imports_status ON cap_table_imports(import_status);
CREATE INDEX idx_cap_table_import_data_snapshot ON cap_table_import_data(import_snapshot_id);
CREATE INDEX idx_cap_table_import_data_imported ON cap_table_import_data(is_imported);

-- Enable RLS
ALTER TABLE cap_table_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_table_import_data ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policies (team can see all imports for their companies)
CREATE POLICY cap_table_imports_select ON cap_table_imports
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY cap_table_imports_insert ON cap_table_imports
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY cap_table_import_data_select ON cap_table_import_data
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY cap_table_import_data_insert ON cap_table_import_data
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY cap_table_import_data_update ON cap_table_import_data
  FOR UPDATE TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
