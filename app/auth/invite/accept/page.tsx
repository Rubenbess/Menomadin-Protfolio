import { Suspense } from 'react'
import AcceptInvitationClient from './AcceptInvitationClient'

export const dynamic = 'force-dynamic'

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <AcceptInvitationClient />
    </Suspense>
  )
}

function LoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 space-y-6">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-950 rounded-lg flex items-center justify-center animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
