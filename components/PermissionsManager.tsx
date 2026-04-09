'use client'

import { useState, useEffect } from 'react'
import { getAllPermissions, updateTablePermission } from '@/lib/permissions'
import { TablePermission, UserRole, TableName, Action } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const ROLES: UserRole[] = ['admin', 'associate', 'viewer']
const TABLES: TableName[] = ['companies', 'contacts', 'tasks', 'documents']
const ACTIONS: Action[] = ['read', 'create', 'update', 'delete']

interface PermissionGrid {
  [key: string]: {
    [key: string]: boolean
  }
}

export default function PermissionsManager() {
  const [permissions, setPermissions] = useState<TablePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [localChanges, setLocalChanges] = useState<PermissionGrid>({})

  useEffect(() => {
    loadPermissions()
  }, [])

  async function loadPermissions() {
    try {
      setLoading(true)
      const data = await getAllPermissions()
      setPermissions(data)
      setLocalChanges({})
    } finally {
      setLoading(false)
    }
  }

  async function handlePermissionChange(
    role: UserRole,
    table: TableName,
    action: Action,
    value: boolean
  ) {
    const key = `${role}_${table}`
    setLocalChanges((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [action]: value,
      },
    }))
  }

  async function saveChanges() {
    try {
      setSaving(true)
      setMessage(null)

      // Group changes by role and table
      for (const key in localChanges) {
        const [role, table] = key.split('_') as [UserRole, TableName]
        const changes = localChanges[key]

        const result = await updateTablePermission(role, table, {
          can_read: changes.read,
          can_create: changes.create,
          can_update: changes.update,
          can_delete: changes.delete,
        })

        if (!result.success) {
          setMessage({ type: 'error', text: `Failed to save ${role} / ${table}: ${result.error}` })
          return
        }
      }

      setMessage({ type: 'success', text: 'Permissions saved successfully!' })
      await loadPermissions()
    } catch (error) {
      setMessage({ type: 'error', text: `Error saving permissions: ${error}` })
    } finally {
      setSaving(false)
    }
  }

  function getPermissionValue(
    role: UserRole,
    table: TableName,
    action: Action
  ): boolean {
    const key = `${role}_${table}`
    if (localChanges[key] && localChanges[key][action] !== undefined) {
      return localChanges[key][action]
    }

    const perm = permissions.find((p) => p.role_name === role && p.table_name === table)
    return perm?.[`can_${action}` as keyof TablePermission] ?? false
  }

  function hasChanges(): boolean {
    return Object.keys(localChanges).length > 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Table Permissions</CardTitle>
          <CardDescription>
            Define what each role can do on specific tables. Changes affect all team members with that role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <div
              className={`rounded-lg p-4 ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Permission Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">
                    Role / Table
                  </th>
                  {ACTIONS.map((action) => (
                    <th key={action} className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-100">
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((role) =>
                  TABLES.map((table) => (
                    <tr key={`${role}_${table}`} className="border-b border-slate-200 dark:border-slate-800">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300">{table}</span>
                        </div>
                      </td>
                      {ACTIONS.map((action) => {
                        const allowed = getPermissionValue(role, table, action)
                        return (
                          <td key={action} className="px-4 py-3 text-center">
                            <button
                              onClick={() =>
                                handlePermissionChange(role, table, action, !allowed)
                              }
                              className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors ${
                                allowed
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:hover:bg-slate-700'
                              }`}
                            >
                              {allowed ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <XCircle className="h-5 w-5" />
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Role Descriptions */}
          <div className="grid gap-4 md:grid-cols-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Admin</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Full access to all operations</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Associate</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Can create and edit, but not delete</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Viewer</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Read-only access to all data</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={loadPermissions}
              disabled={!hasChanges() || saving}
            >
              Discard Changes
            </Button>
            <Button
              onClick={saveChanges}
              disabled={!hasChanges() || saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Permissions'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
