// Stub: All users have full permissions (permissions system removed)
export function usePermission(action: any, tableName: any) {
  return { allowed: true, loading: false, reason: undefined }
}

export function usePermissions(table: any) {
  return {
    canRead: { allowed: true },
    canCreate: { allowed: true },
    canUpdate: { allowed: true },
    canDelete: { allowed: true },
    loading: false,
  }
}
