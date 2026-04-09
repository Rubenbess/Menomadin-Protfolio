import { useEffect, useState } from 'react'
import { checkPermission, Action, TableName, PermissionCheck } from '@/lib/permissions'

export function usePermission(action: Action, tableName: TableName) {
  const [permission, setPermission] = useState<PermissionCheck>({ allowed: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkPerms = async () => {
      try {
        const result = await checkPermission(action, tableName)
        setPermission(result)
      } catch (error) {
        console.error('Error checking permission:', error)
        setPermission({ allowed: false, reason: 'Permission check failed' })
      } finally {
        setLoading(false)
      }
    }

    checkPerms()
  }, [action, tableName])

  return {
    allowed: permission.allowed,
    loading,
    reason: permission.reason,
  }
}

/**
 * Hook to check multiple permissions at once
 */
export function usePermissions(table: TableName) {
  const [permissions, setPermissions] = useState({
    canRead: { allowed: false },
    canCreate: { allowed: false },
    canUpdate: { allowed: false },
    canDelete: { allowed: false },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkPerms = async () => {
      try {
        const [read, create, update, del] = await Promise.all([
          checkPermission('read', table),
          checkPermission('create', table),
          checkPermission('update', table),
          checkPermission('delete', table),
        ])

        setPermissions({
          canRead: read,
          canCreate: create,
          canUpdate: update,
          canDelete: del,
        })
      } catch (error) {
        console.error('Error checking permissions:', error)
      } finally {
        setLoading(false)
      }
    }

    checkPerms()
  }, [table])

  return { ...permissions, loading }
}
