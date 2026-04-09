import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getInvitationByCode } from '@/lib/invitations'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Props {
  searchParams: Promise<{ code?: string }>
}

export default async function InvitePage({ searchParams }: Props) {
  const { code } = await searchParams

  if (!code) {
    return <InvalidInvitation reason="No invitation code provided" />
  }

  // Get invitation details
  const invitation = await getInvitationByCode(code)

  if (!invitation) {
    return <InvalidInvitation reason="Invalid or expired invitation" />
  }

  // Check if user is already logged in
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If already logged in and email matches, redirect to accept
  if (user && user.email?.toLowerCase() === invitation.email.toLowerCase()) {
    redirect(`/auth/invite/accept?code=${code}`)
  }

  // If already logged in but different email
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 space-y-6">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950 rounded-lg flex items-center justify-center">
                <AlertCircle className="text-amber-600 dark:text-amber-300" size={24} />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Wrong Account</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                You're logged in as <span className="font-semibold">{user.email}</span>
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                But the invitation is for <span className="font-semibold">{invitation.email}</span>
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">Please sign out and sign in with the correct email address.</p>
              <a
                href="/auth/logout"
                className="block w-full px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors text-center"
              >
                Sign Out
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Not logged in - show invitation details and sign in prompt
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" size={24} />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Welcome to Menomadin!</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">You've been invited to join our team</p>
          </div>

          {/* Invitation Details */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{invitation.email}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Your Role</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    invitation.invited_role === 'admin'
                      ? 'bg-primary-500'
                      : invitation.invited_role === 'associate'
                        ? 'bg-blue-500'
                        : 'bg-slate-400'
                  }`}
                />
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 capitalize">{invitation.invited_role}</p>
              </div>
            </div>
          </div>

          {/* Role Permissions */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-400 uppercase tracking-wider mb-3">What you can do:</p>
            <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                View all company and portfolio data
              </li>
              {(invitation.invited_role === 'admin' || invitation.invited_role === 'associate') && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    Create and edit records
                  </li>
                </>
              )}
              {invitation.invited_role === 'admin' && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    Delete records
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    Manage team permissions
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Sign In Button */}
          <div className="space-y-3">
            <a
              href={`/auth/login?code=${code}&email=${encodeURIComponent(invitation.email)}`}
              className="block w-full px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors text-center"
            >
              Sign In & Accept Invitation
            </a>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
              We'll use your Microsoft account to sign you in
            </p>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              This invitation expires on{' '}
              <span className="font-semibold">{new Date(invitation.expires_at).toLocaleDateString('en-US')}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InvalidInvitation({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 space-y-6">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-red-600 dark:text-red-300" size={24} />
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Invalid Invitation</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{reason}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
              Please ask the team admin to send you a new invitation.
            </p>
            <Link
              href="/auth/login"
              className="block w-full px-4 py-2.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 rounded-lg text-sm font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors text-center"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
