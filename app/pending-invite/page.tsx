'use client'

import Link from 'next/link'
import { Mail, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function PendingInvitePage() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invitation Pending</h1>
          <p className="text-slate-600">You've been invited to join Menomadin Portfolio, but haven't accepted your invitation yet.</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
          <p><strong>To get started:</strong></p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Check your email for an invitation link</li>
            <li>Click the link to accept the invitation</li>
            <li>Return here to access the app</li>
          </ol>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
