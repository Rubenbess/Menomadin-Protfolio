import { createClient } from '@/lib/supabase'

export type UserRole = 'admin' | 'associate' | 'viewer'
export type TableName = 'companies' | 'contacts' | 'tasks' | 'documents'
export type Action = 'read' | 'create' | 'update' | 'delete'

export interface TablePermission {
  id: string
  role_name: UserRole
  table_name: TableName
  can_read: boolean
  can_create: boolean
  can_update: boolean
  can_delete: boolean
  created_at: string
}

export interface PermissionCheck {
  allowed: boolean
  reason?: string
}

/**
 * Check if the current user can perform an action on a table
 * This should be called from the client-side to show/hide UI elements
 */
export async function checkPermission(
  action: Action,
  tableName: TableName,
  userId?: string
): Promise<PermissionCheck> {
  try {
    const supabase = createClient()

    // Get current user's role
    const userRole = await getUserRole(userId)
    if (!userRole) {
      return { allowed: false, reason: 'No user role found' }
    }

    // Query table_permissions
    const { data, error } = await supabase
      .from('table_permissions')
      .select('*')
      .eq('role_name', userRole)
      .eq('table_name', tableName)
      .single()

    if (error || !data) {
      return { allowed: false, reason: 'No permission record found' }
    }

    const permission = data as TablePermission
    const allowed = permission[`can_${action}` as keyof TablePermission]

    return { allowed: allowed as boolean }
  } catch (error) {
    console.error('Permission check error:', error)
    return { allowed: false, reason: 'Permission check failed' }
  }
}

/**
 * Get the current user's role
 */
export async function getUserRole(userId?: string): Promise<UserRole | null> {
  try {
    const supabase = createClient()
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id

    if (!currentUserId) return null

    const { data, error } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', currentUserId)
      .single()

    if (error || !data) return null
    return (data.role as UserRole) || null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

/**
 * Get all permissions for a specific role
 */
export async function getRolePermissions(
  role: UserRole
): Promise<Record<TableName, Record<Action, boolean>>> {
  const defaultPermissions: Record<TableName, Record<Action, boolean>> = {
    companies: { read: false, create: false, update: false, delete: false },
    contacts: { read: false, create: false, update: false, delete: false },
    tasks: { read: false, create: false, update: false, delete: false },
    documents: { read: false, create: false, update: false, delete: false },
  }

  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('table_permissions')
      .select('*')
      .eq('role_name', role)

    if (error || !data) return defaultPermissions

    const permissions: Record<TableName, Record<Action, boolean>> = { ...defaultPermissions }

    data.forEach((perm: TablePermission) => {
      permissions[perm.table_name] = {
        read: perm.can_read,
        create: perm.can_create,
        update: perm.can_update,
        delete: perm.can_delete,
      }
    })

    return permissions
  } catch (error) {
    console.error('Error getting role permissions:', error)
    return defaultPermissions
  }
}

/**
 * Update permissions for a role on a table
 * Only admins can call this
 */
export async function updateTablePermission(
  role: UserRole,
  table: TableName,
  actions: { can_read?: boolean; can_create?: boolean; can_update?: boolean; can_delete?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if current user is admin
    const userRole = await getUserRole()
    if (userRole !== 'admin') {
      return { success: false, error: 'Only admins can update permissions' }
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('table_permissions')
      .update(actions)
      .eq('role_name', role)
      .eq('table_name', table)
      .select()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Get all roles and their permissions
 */
export async function getAllPermissions(): Promise<TablePermission[]> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('table_permissions')
      .select('*')
      .order('role_name', { ascending: true })
      .order('table_name', { ascending: true })

    if (error || !data) return []
    return data as TablePermission[]
  } catch (error) {
    console.error('Error getting all permissions:', error)
    return []
  }
}

/**
 * Helper to show/hide buttons based on permissions
 */
export const canRead = (permission: PermissionCheck) => permission.allowed
export const canCreate = (permission: PermissionCheck) => permission.allowed
export const canEdit = (permission: PermissionCheck) => permission.allowed
export const canDelete = (permission: PermissionCheck) => permission.allowed
