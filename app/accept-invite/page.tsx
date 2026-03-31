'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { acceptTeamInvite } from '@/actions/team'

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteId = searchParams.get('id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!inviteId) {
      setStatus('error')
      setMessage('Invalid invitation link')
      return
    }

    async function accept() {
      try {
        await acceptTeamInvite(inviteId)
        setStatus('success')
        setMessage('Invitation accepted! Redirecting to dashboard...')
        setTimeout(() => router.push('/dashboard'), 2000)
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Failed to accept invitation')
      }
    }

    accept()
  }, [inviteId, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader className="w-12 h-12 mx-auto text-violet-600 animate-spin" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Accepting Invitation</h2>
              <p className="text-slate-600">Please wait while we process your invitation...</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome!</h2>
              <p className="text-slate-600">{message}</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 mx-auto text-red-600" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Invitation Error</h2>
              <p className="text-slate-600 mb-4">{message}</p>
              <Link
                href="/login"
                className="inline-block px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
