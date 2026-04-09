'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2, Shield } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { TeamMember, UserRole } from '@/lib/types'

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access - can create, edit, delete everything and manage permissions' },
  { value: 'associate', label: 'Associate', description: 'Can create and edit - cannot delete records or manage permissions' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only - can view all data but cannot make any changes' },
]

export default function TeamMemberManager() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setMembers((data as TeamMember[]) || [])
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to load team members: ${error}` })
    } finally {
      setLoading(false)
    }
  }

  async function updateMemberRole(memberId: string, newRole: UserRole) {
    try {
      setSaving(true)
      setMessage(null)
      const supabase = createClient()

      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      )
      setSelectedMember(null)
      setMessage({ type: 'success', text: 'Role updated successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to update role: ${error}` })
    } finally {
      setSaving(false)
    }
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
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm dark:shadow-md border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary-500" />
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Team Members</h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Assign roles to control what each team member can do
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {message && (
            <div
              className={`rounded-lg p-4 text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500">No team members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{member.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{member.email}</p>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <div className="flex gap-2">
                      {ROLE_OPTIONS.map((role) => (
                        <button
                          key={role.value}
                          onClick={() => {
                            setSelectedMember(member)
                            updateMemberRole(member.id, role.value)
                          }}
                          disabled={saving}
                          title={role.description}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            member.role === role.value
                              ? 'bg-primary-500 text-white'
                              : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-500'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm dark:shadow-md border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Role Permissions</h3>
        </div>
        <div className="p-6 space-y-4">
          {ROLE_OPTIONS.map((role) => (
            <div key={role.value} className="space-y-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    role.value === 'admin'
                      ? 'bg-primary-500'
                      : role.value === 'associate'
                        ? 'bg-blue-500'
                        : 'bg-slate-400'
                  }`}
                />
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{role.label}</h4>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 ml-5">{role.description}</p>
              <div className="text-xs text-neutral-500 dark:text-neutral-500 ml-5 mt-2 space-y-1">
                {role.value === 'admin' && (
                  <>
                    <p>✅ View all data</p>
                    <p>✅ Create records</p>
                    <p>✅ Edit records</p>
                    <p>✅ Delete records</p>
                    <p>✅ Manage permissions</p>
                    <p>✅ Invite team members</p>
                  </>
                )}
                {role.value === 'associate' && (
                  <>
                    <p>✅ View all data</p>
                    <p>✅ Create records</p>
                    <p>✅ Edit records</p>
                    <p>❌ Delete records</p>
                    <p>❌ Manage permissions</p>
                    <p>❌ Invite team members</p>
                  </>
                )}
                {role.value === 'viewer' && (
                  <>
                    <p>✅ View all data</p>
                    <p>❌ Create records</p>
                    <p>❌ Edit records</p>
                    <p>❌ Delete records</p>
                    <p>❌ Manage permissions</p>
                    <p>❌ Invite team members</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
