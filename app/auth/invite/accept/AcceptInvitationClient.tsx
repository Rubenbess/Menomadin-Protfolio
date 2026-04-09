'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { acceptInvitation, getInvitationByCode } from '@/lib/invitations'
import { createClient } from '@/lib/supabase'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AcceptInvitationClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  const [status, setStatus] = useState<'accepting' | 'success' | 'error'>('accepting')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    acceptInvite()
  }, [code])

  async function acceptInvite() {
    if (!code) {
      setError('No invitation code provided')
      setStatus('error')
      return
    }

    try {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user || !user.email) {
        throw new Error('Failed to get user information')
      }

      // Get invitation details
      const invitation = await getInvitationByCode(code)

      if (!invitation) {
        throw new Error('Invalid or expired invitation')
      }

      // Check if email matches
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new Error(`Invitation is for ${invitation.email}, but you're signed in as ${user.email}`)
      }

      // Accept the invitation
      const result = await acceptInvitation(
        code,
        user.id,
        user.user_metadata?.name || user.email.split('@')[0],
        user.email
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to accept invitation')
      }

      setStatus('success')

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 space-y-6">
          {status === 'accepting' && (
            <>
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-950 rounded-lg flex items-center justify-center">
                  <Loader2 className="text-primary-500 dark:text-primary-400 animate-spin" size={24} />
                </div>
              </div>

              <div className="space-y-2 text-center">
                <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Accepting Invitation...</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Setting up your account</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" size={24} />
                </div>
              </div>

              <div className="space-y-2 text-center">
                <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Welcome!</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Your account is ready. Redirecting to dashboard...</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
                  <AlertCircle className="text-red-600 dark:text-red-300" size={24} />
                </div>
              </div>

              <div className="space-y-2 text-center">
                <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Something Went Wrong</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
              </div>

              <a
                href="/dashboard"
                className="block w-full px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors text-center"
              >
                Go to Dashboard
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
