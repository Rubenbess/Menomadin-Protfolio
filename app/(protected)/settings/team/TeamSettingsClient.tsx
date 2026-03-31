'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Trash2, Shield, Eye, Copy, CheckCircle } from 'lucide-react'
import { inviteTeamMember, removeTeamMember, updateTeamMemberRole, deleteTeamInvite } from '@/actions/team'
import type { TeamMember, TeamInvite, UserRole } from '@/lib/types'

interface Props {
  initialMembers: TeamMember[]
  initialInvites: TeamInvite[]
}

export default function TeamSettingsClient({ initialMembers, initialInvites }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [invites, setInvites] = useState(initialInvites)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('associate')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await inviteTeamMember(email, role)
      setSuccess('Invitation sent successfully')
      setEmail('')
      setRole('associate')
      router.refresh()
      // Refresh invites
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      await removeTeamMember(userId)
      setMembers(members.filter(m => m.user_id !== userId))
      setSuccess('Team member removed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  async function handleUpdateRole(userId: string, newRole: UserRole) {
    try {
      await updateTeamMemberRole(userId, newRole)
      setMembers(members.map(m => m.user_id === userId ? { ...m, role: newRole } : m))
      setSuccess('Role updated')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  async function handleDeleteInvite(inviteId: string) {
    if (!confirm('Are you sure you want to delete this invitation?')) return

    try {
      await deleteTeamInvite(inviteId)
      setInvites(invites.filter(i => i.id !== inviteId))
      setSuccess('Invitation deleted')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invitation')
    }
  }

  function handleCopyInviteLink(inviteId: string) {
    const link = `${window.location.origin}/accept-invite?id=${inviteId}`
    navigator.clipboard.writeText(link)
    setCopiedId(inviteId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield size={14} className="text-amber-500" />
      case 'associate':
        return <Shield size={14} className="text-blue-500" />
      case 'viewer':
        return <Eye size={14} className="text-slate-500" />
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'associate':
        return 'Associate'
      case 'viewer':
        return 'Viewer'
    }
  }

  return (
    <div className="space-y-8">
      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-900 text-sm">
          {success}
        </div>
      )}

      {/* Invite Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Invite Team Member</h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="viewer">Viewer</option>
                <option value="associate">Associate</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Team Members ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-slate-500 text-sm">No team members yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Role</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">{member.name}</td>
                    <td className="py-3 px-4 text-slate-600">{member.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.user_id, e.target.value as UserRole)}
                        className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="associate">Associate</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invites.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Pending Invitations ({invites.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Sent</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <Mail size={14} className="text-slate-400" />
                      {invite.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1">
                        {getRoleIcon(invite.role)}
                        {getRoleLabel(invite.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        invite.status === 'pending'
                          ? 'bg-yellow-50 text-yellow-700'
                          : invite.status === 'accepted'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-50 text-slate-700'
                      }`}>
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {new Date(invite.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {invite.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyInviteLink(invite.id)}
                            className="text-slate-400 hover:text-violet-600 transition-colors"
                            title="Copy invite link"
                          >
                            {copiedId === invite.id ? (
                              <CheckCircle size={16} className="text-green-600" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteInvite(invite.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete invitation"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Information */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Role Permissions</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <div><strong>Admin:</strong> Full access, can invite/remove members and change roles</div>
          <div><strong>Associate:</strong> Can create and edit portfolio data, but cannot manage team</div>
          <div><strong>Viewer:</strong> Read-only access to all data</div>
        </div>
      </div>
    </div>
  )
}
