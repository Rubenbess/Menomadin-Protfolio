'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

/**
 * Route-level error boundary for every protected page. Catches errors thrown by
 * the async server components (e.g. an RLS / connectivity failure on a data
 * query) and renders a branded retry UI instead of Next.js's bare default error
 * screen. `reset()` re-renders the segment, retrying the failed render.
 *
 * Note: this cannot catch a throw from the protected `layout.tsx` itself — that
 * requires a root `app/global-error.tsx`.
 */
export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the error to the console/monitoring; the digest correlates with the
    // server log entry for the same error.
    console.error('Protected route error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="text-red-500 dark:text-red-400" size={24} />
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          This page couldn&apos;t load its data. This is usually temporary — please try again.
          If it persists, contact the platform administrator.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-neutral-400 dark:text-neutral-600">
            Ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-semibold text-white dark:text-neutral-900 transition-colors hover:bg-neutral-700 dark:hover:bg-neutral-300"
        >
          <RotateCw size={14} />
          Try again
        </button>
      </div>
    </div>
  )
}
