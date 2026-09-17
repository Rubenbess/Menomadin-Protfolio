-- ============================================================
-- Secure the RBAC permission matrix
--
-- Fixes two findings from the daily health check:
--
--   1. CRITICAL — `roles` and `table_permissions` were the only two tables in
--      the schema without RLS enabled. Every other policy delegates to
--      `can_perform_action()`, which reads `table_permissions` directly, so a
--      user provisioned as `viewer` could run
--        update table_permissions set can_delete = true where role_name = 'viewer'
--      from the browser with nothing but the public anon key and immediately
--      gain delete rights over the entire investment and cap-table dataset.
--      The matrix that governs access was itself writable by the roles it
--      governs.
--
--   2. HIGH — `can_perform_action()` returned NULL when no permission row
--      matched. RLS treats NULL as deny, so this was safe by accident rather
--      than by design, and undiagnosable when it happened: deleting a single
--      matrix row took a table dark platform-wide with no error surfaced
--      anywhere.
--
-- Lockout safety: both helper functions are converted to SECURITY DEFINER so
-- they continue to read the matrix regardless of the new RLS policies. Without
-- this, enabling RLS on `table_permissions` would make every policy that calls
-- `can_perform_action()` evaluate against a table the caller may not be able to
-- read, denying access platform-wide. The functions are STABLE and take no
-- user-controlled table identifiers beyond a text comparison, so there is no
-- injection surface.
-- ============================================================

-- ─── 1. Helper functions: definer rights + explicit deny ────────────────────

-- search_path is pinned on both functions: a SECURITY DEFINER function that
-- resolves unqualified names through the caller's search_path can be tricked
-- into reading an attacker-created table of the same name.

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role::text, 'viewer'::text)
  FROM team_members
  WHERE id = auth.uid()
  LIMIT 1
$$;

-- COALESCE makes the "no matching row" case an explicit, intentional deny
-- rather than a NULL that happens to evaluate as one.
CREATE OR REPLACE FUNCTION can_perform_action(
  p_table_name TEXT,
  p_action TEXT
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN p_action = 'read'   THEN tp.can_read
        WHEN p_action = 'create' THEN tp.can_create
        WHEN p_action = 'update' THEN tp.can_update
        WHEN p_action = 'delete' THEN tp.can_delete
        ELSE false
      END
      FROM table_permissions tp
      WHERE tp.role_name = get_user_role()
        AND tp.table_name = p_table_name
      LIMIT 1
    ),
    false
  )
$$;

-- ─── 2. Enable RLS on the matrix tables ─────────────────────────────────────

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_permissions ENABLE ROW LEVEL SECURITY;

-- Read-only to authenticated users: the Settings UI displays the matrix, and
-- denying SELECT outright would blank that screen. Deliberately no INSERT,
-- UPDATE or DELETE policy — with RLS enabled and no write policy, every
-- client-side write is refused. Permission changes go through the service-role
-- admin path, which bypasses RLS by design.
DROP POLICY IF EXISTS "roles_read" ON roles;
CREATE POLICY "roles_read" ON roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "table_permissions_read" ON table_permissions;
CREATE POLICY "table_permissions_read" ON table_permissions
  FOR SELECT TO authenticated USING (true);

-- ─── 3. Point the documents policies at the documents permission row ────────
--
-- The `documents` rows in the matrix were populated and surfaced in the admin
-- UI but never enforced: all four policies delegated to
-- can_perform_action('companies', ...). An admin narrowing document access
-- would have seen the change save and do nothing. The seeded values for
-- 'documents' are identical to 'companies' for all three roles, so this changes
-- no effective permission today — it makes the row an admin edits the row that
-- actually governs.

DROP POLICY IF EXISTS "documents_read_policy" ON documents;
CREATE POLICY "documents_read_policy" ON documents
  FOR SELECT
  USING (can_perform_action('documents', 'read'));

DROP POLICY IF EXISTS "documents_create_policy" ON documents;
CREATE POLICY "documents_create_policy" ON documents
  FOR INSERT
  WITH CHECK (can_perform_action('documents', 'create'));

DROP POLICY IF EXISTS "documents_update_policy" ON documents;
CREATE POLICY "documents_update_policy" ON documents
  FOR UPDATE
  USING (can_perform_action('documents', 'update'))
  WITH CHECK (can_perform_action('documents', 'update'));

DROP POLICY IF EXISTS "documents_delete_policy" ON documents;
CREATE POLICY "documents_delete_policy" ON documents
  FOR DELETE
  USING (can_perform_action('documents', 'delete'));

COMMENT ON FUNCTION can_perform_action(TEXT, TEXT) IS
  'Check if current user can perform an action on a table. SECURITY DEFINER so it can read table_permissions under RLS. Returns false (never NULL) when no matrix row matches.';

-- ─── Post-apply verification ────────────────────────────────────────────────
--
-- Run as a `viewer`-role user from the client, NOT as service role. Expected:
-- the first two raise "new row violates row-level security policy" (or report 0
-- rows updated), and the SELECTs still return the matrix.
--
--   update table_permissions set can_delete = true where role_name = 'viewer';
--   insert into roles (name) values ('superuser');
--   select * from table_permissions;   -- should still succeed
--   select * from companies limit 1;   -- should still succeed
