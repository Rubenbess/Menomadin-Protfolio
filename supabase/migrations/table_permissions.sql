-- ============================================================
-- Table Permissions System
-- Enables role-based access control (RBAC) for data operations
-- ============================================================

-- Create roles table (if not exists)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (name IN ('admin', 'associate', 'viewer')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full access to all operations'),
  ('associate', 'Can create and edit records, no delete'),
  ('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Create table_permissions table
-- Defines what actions each role can perform on each table
CREATE TABLE IF NOT EXISTS table_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL CHECK (role_name IN ('admin', 'associate', 'viewer')),
  table_name TEXT NOT NULL CHECK (table_name IN ('companies', 'contacts', 'tasks', 'documents')),
  can_read BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_name, table_name)
);

-- Insert default permissions
-- Admins: Full access to everything
INSERT INTO table_permissions (role_name, table_name, can_read, can_create, can_update, can_delete) VALUES
  ('admin', 'companies', true, true, true, true),
  ('admin', 'contacts', true, true, true, true),
  ('admin', 'tasks', true, true, true, true),
  ('admin', 'documents', true, true, true, true),
  -- Associates: Can create and edit, but not delete
  ('associate', 'companies', true, true, true, false),
  ('associate', 'contacts', true, true, true, false),
  ('associate', 'tasks', true, true, true, false),
  ('associate', 'documents', true, true, true, false),
  -- Viewers: Read-only
  ('viewer', 'companies', true, false, false, false),
  ('viewer', 'contacts', true, false, false, false),
  ('viewer', 'tasks', true, false, false, false),
  ('viewer', 'documents', true, false, false, false)
ON CONFLICT (role_name, table_name) DO NOTHING;

-- Function to get user's role from team_members table
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(role::text, 'viewer'::text)
  FROM team_members
  WHERE id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL STABLE;

-- Function to check if user can perform action on table
CREATE OR REPLACE FUNCTION can_perform_action(
  p_table_name TEXT,
  p_action TEXT
) RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN p_action = 'read' THEN tp.can_read
    WHEN p_action = 'create' THEN tp.can_create
    WHEN p_action = 'update' THEN tp.can_update
    WHEN p_action = 'delete' THEN tp.can_delete
    ELSE false
  END
  FROM table_permissions tp
  WHERE tp.role_name = get_user_role()
    AND tp.table_name = p_table_name
$$ LANGUAGE SQL STABLE;

-- ─── Update RLS Policies ────────────────────────────────────

-- Drop existing permissive policies
DROP POLICY IF EXISTS "authenticated_all" ON companies;
DROP POLICY IF EXISTS "authenticated_all" ON contacts;
DROP POLICY IF EXISTS "authenticated_all" ON rounds;
DROP POLICY IF EXISTS "authenticated_all" ON investments;
DROP POLICY IF EXISTS "authenticated_all" ON cap_table;
DROP POLICY IF EXISTS "authenticated_all" ON reserves;
DROP POLICY IF EXISTS "authenticated_all" ON documents;
DROP POLICY IF EXISTS "authenticated_all" ON pipeline;

-- Companies - Permission-based policies
CREATE POLICY "companies_read_policy" ON companies
  FOR SELECT
  USING (can_perform_action('companies', 'read'));

CREATE POLICY "companies_create_policy" ON companies
  FOR INSERT
  WITH CHECK (can_perform_action('companies', 'create'));

CREATE POLICY "companies_update_policy" ON companies
  FOR UPDATE
  USING (can_perform_action('companies', 'update'))
  WITH CHECK (can_perform_action('companies', 'update'));

CREATE POLICY "companies_delete_policy" ON companies
  FOR DELETE
  USING (can_perform_action('companies', 'delete'));

-- Contacts - Permission-based policies
CREATE POLICY "contacts_read_policy" ON contacts
  FOR SELECT
  USING (can_perform_action('contacts', 'read'));

CREATE POLICY "contacts_create_policy" ON contacts
  FOR INSERT
  WITH CHECK (can_perform_action('contacts', 'create'));

CREATE POLICY "contacts_update_policy" ON contacts
  FOR UPDATE
  USING (can_perform_action('contacts', 'update'))
  WITH CHECK (can_perform_action('contacts', 'update'));

CREATE POLICY "contacts_delete_policy" ON contacts
  FOR DELETE
  USING (can_perform_action('contacts', 'delete'));

-- Dependent tables inherit permissions from related companies/contacts

-- Rounds - inherit from companies
CREATE POLICY "rounds_read_policy" ON rounds
  FOR SELECT
  USING (can_perform_action('companies', 'read'));

CREATE POLICY "rounds_create_policy" ON rounds
  FOR INSERT
  WITH CHECK (can_perform_action('companies', 'create'));

CREATE POLICY "rounds_update_policy" ON rounds
  FOR UPDATE
  USING (can_perform_action('companies', 'update'))
  WITH CHECK (can_perform_action('companies', 'update'));

CREATE POLICY "rounds_delete_policy" ON rounds
  FOR DELETE
  USING (can_perform_action('companies', 'delete'));

-- Investments - inherit from companies
CREATE POLICY "investments_read_policy" ON investments
  FOR SELECT
  USING (can_perform_action('companies', 'read'));

CREATE POLICY "investments_create_policy" ON investments
  FOR INSERT
  WITH CHECK (can_perform_action('companies', 'create'));

CREATE POLICY "investments_update_policy" ON investments
  FOR UPDATE
  USING (can_perform_action('companies', 'update'))
  WITH CHECK (can_perform_action('companies', 'update'));

CREATE POLICY "investments_delete_policy" ON investments
  FOR DELETE
  USING (can_perform_action('companies', 'delete'));

-- Cap Table - inherit from companies
CREATE POLICY "cap_table_read_policy" ON cap_table
  FOR SELECT
  USING (can_perform_action('companies', 'read'));

CREATE POLICY "cap_table_create_policy" ON cap_table
  FOR INSERT
  WITH CHECK (can_perform_action('companies', 'create'));

CREATE POLICY "cap_table_update_policy" ON cap_table
  FOR UPDATE
  USING (can_perform_action('companies', 'update'))
  WITH CHECK (can_perform_action('companies', 'update'));

CREATE POLICY "cap_table_delete_policy" ON cap_table
  FOR DELETE
  USING (can_perform_action('companies', 'delete'));

-- Reserves - inherit from companies
CREATE POLICY "reserves_read_policy" ON reserves
  FOR SELECT
  USING (can_perform_action('companies', 'read'));

CREATE POLICY "reserves_create_policy" ON reserves
  FOR INSERT
  WITH CHECK (can_perform_action('companies', 'create'));

CREATE POLICY "reserves_update_policy" ON reserves
  FOR UPDATE
  USING (can_perform_action('companies', 'update'))
  WITH CHECK (can_perform_action('companies', 'update'));

CREATE POLICY "reserves_delete_policy" ON reserves
  FOR DELETE
  USING (can_perform_action('companies', 'delete'));

-- Documents - inherit from companies
CREATE POLICY "documents_read_policy" ON documents
  FOR SELECT
  USING (can_perform_action('companies', 'read'));

CREATE POLICY "documents_create_policy" ON documents
  FOR INSERT
  WITH CHECK (can_perform_action('companies', 'create'));

CREATE POLICY "documents_update_policy" ON documents
  FOR UPDATE
  USING (can_perform_action('companies', 'update'))
  WITH CHECK (can_perform_action('companies', 'update'));

CREATE POLICY "documents_delete_policy" ON documents
  FOR DELETE
  USING (can_perform_action('companies', 'delete'));

-- Pipeline - inherit from companies
CREATE POLICY "pipeline_read_policy" ON pipeline
  FOR SELECT
  USING (can_perform_action('companies', 'read'));

CREATE POLICY "pipeline_create_policy" ON pipeline
  FOR INSERT
  WITH CHECK (can_perform_action('companies', 'create'));

CREATE POLICY "pipeline_update_policy" ON pipeline
  FOR UPDATE
  USING (can_perform_action('companies', 'update'))
  WITH CHECK (can_perform_action('companies', 'update'));

CREATE POLICY "pipeline_delete_policy" ON pipeline
  FOR DELETE
  USING (can_perform_action('companies', 'delete'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_table_permissions_role ON table_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_table_permissions_table ON table_permissions(table_name);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Add comments
COMMENT ON TABLE table_permissions IS 'Role-based access control matrix - defines what each role can do on each table';
COMMENT ON TABLE roles IS 'Available user roles in the system';
COMMENT ON FUNCTION get_user_role() IS 'Get the current user''s role from team_members table';
COMMENT ON FUNCTION can_perform_action(TEXT, TEXT) IS 'Check if current user can perform an action on a table';
