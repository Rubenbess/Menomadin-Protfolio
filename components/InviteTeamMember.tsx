'use client'

import { useState, useEffect } from 'react'
import { sendInvitation, getPendingInvitations, revokeInvitation } from '@/lib/invitations'
import type { Invitation } from '@/lib/invitations'
import type { UserRole } from '@/lib/types'
import Button from '@/components/ui/Button'
import { Send, Trash2, Loader2, Mail, Clock, CheckCircle2 } from 'lucide-react'

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access + permission management' },
  { value: 'associate', label: 'Associate', description: 'Create & edit, no delete' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
]

export default function InviteTeamMember() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('viewer')
  const [loading, setLoading] = useState(false)
  const [loadingPending, setLoadingPending] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([])
  const [revoking, setRevoking] = useState<string | null>(null)

  // Load pending invitations on mount
  useEffect(() => {
    loadPendingInvitations()
  }, [])

  async function loadPendingInvitations() {
    try {
      setLoadingPending(true)
      const invites = await getPendingInvitations()
      setPendingInvitations(invites)
    } catch (error) {
      console.error('Failed to load invitations:', error)
    } finally {
      setLoadingPending(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    try {
      setLoading(true)
      setMessage(null)

      // Get current site URL
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

      const result = await sendInvitation(email, role, siteUrl)

      if (!result.success) {
        setMessage({ type: 'error', text: result.error || 'Failed to send invitation' })
        return
      }

      setMessage({ type: 'success', text: `Invitation sent to ${email}!` })
      setEmail('')
      setRole('viewer')

      // Reload pending invitations
      await loadPendingInvitations()
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error}` })
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(invitationId: string) {
    if (!confirm('Revoke this invitation?')) return

    try {
      setRevoking(invitationId)
      const result = await revokeInvitation(invitationId)

      if (!result.success) {
        setMessage({ type: 'error', text: 'Failed to revoke invitation' })
        return
      }

      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
      setMessage({ type: 'success', text: 'Invitation revoked' })
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error}` })
    } finally {
      setRevoking(null)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm dark:shadow-md border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-primary-500" />
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Invite Team Member</h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Send invitation via email with magic link
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

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                disabled={loading}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} - {opt.description}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={loading || !email.trim()} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Pending Invitations */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm dark:shadow-md border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Pending Invitations</h3>
          </div>
        </div>

        <div className="p-6">
          {loadingPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : pendingInvitations.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">No pending invitations</p>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{invitation.email}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        Role: <span className="font-semibold">{invitation.invited_role}</span>
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        Expires: {formatDate(invitation.expires_at)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevoke(invitation.id)}
                    disabled={revoking === invitation.id}
                    className="ml-4 p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors flex-shrink-0"
                    title="Revoke invitation"
                  >
                    {revoking === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
