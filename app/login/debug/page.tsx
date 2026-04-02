'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function DebugPage() {
  const [status, setStatus] = useState<{
    supabaseUrl: string
    supabaseKey: string
    urlValid: boolean
    keyValid: boolean
    canConnect: boolean
    error: string | null
  } | null>(null)

  useEffect(() => {
    async function diagnose() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        const urlValid = !!url && url.startsWith('https://')
        const keyValid = !!key && key.length > 10

        let canConnect = false
        let error = null

        if (!urlValid || !keyValid) {
          error = 'Missing or invalid Supabase credentials'
        } else {
          try {
            const supabase = createClient()
            const response = await Promise.race([
              supabase.auth.getSession(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ])
            canConnect = true
          } catch (err) {
            error = err instanceof Error ? err.message : 'Connection failed'
            canConnect = false
          }
        }

        setStatus({
          supabaseUrl: url || 'NOT SET',
          supabaseKey: key ? key.substring(0, 20) + '...' : 'NOT SET',
          urlValid,
          keyValid,
          canConnect,
          error,
        })
      } catch (err) {
        console.error('Diagnostic error:', err)
      }
    }

    diagnose()
  }, [])

  if (!status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="text-white">Running diagnostics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full space-y-4">
        <h1 className="text-2xl font-bold text-white mb-6">🔍 Supabase Configuration Diagnostic</h1>

        {/* Supabase URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-slate-300 font-medium">Supabase URL</label>
            <span className={`text-sm font-semibold ${status.urlValid ? 'text-green-400' : 'text-red-400'}`}>
              {status.urlValid ? '✅' : '❌'}
            </span>
          </div>
          <p className="text-xs text-slate-400 bg-slate-700/50 p-2 rounded break-all">
            {status.supabaseUrl}
          </p>
          {!status.urlValid && (
            <p className="text-xs text-red-400">
              ❌ Must be set and start with https://
            </p>
          )}
        </div>

        {/* Supabase Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-slate-300 font-medium">Supabase Anon Key</label>
            <span className={`text-sm font-semibold ${status.keyValid ? 'text-green-400' : 'text-red-400'}`}>
              {status.keyValid ? '✅' : '❌'}
            </span>
          </div>
          <p className="text-xs text-slate-400 bg-slate-700/50 p-2 rounded break-all">
            {status.supabaseKey}
          </p>
          {!status.keyValid && (
            <p className="text-xs text-red-400">
              ❌ Must be set and at least 10 characters
            </p>
          )}
        </div>

        {/* Connection Test */}
        <div className="space-y-2 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <label className="text-slate-300 font-medium">Connection Test</label>
            <span className={`text-sm font-semibold ${status.canConnect ? 'text-green-400' : 'text-red-400'}`}>
              {status.canConnect ? '✅' : '❌'}
            </span>
          </div>
          {status.canConnect ? (
            <p className="text-sm text-green-400">
              ✅ Can connect to Supabase
            </p>
          ) : (
            <p className="text-sm text-red-400">
              ❌ Cannot connect to Supabase: {status.error}
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t border-slate-700">
          <h3 className="text-slate-300 font-medium mb-2">Summary:</h3>
          {status.urlValid && status.keyValid && status.canConnect ? (
            <div className="bg-green-900/20 border border-green-700/50 rounded p-3">
              <p className="text-green-400 text-sm">
                ✅ Supabase is properly configured! Try logging in again.
              </p>
            </div>
          ) : (
            <div className="bg-red-900/20 border border-red-700/50 rounded p-3 space-y-2">
              {!status.urlValid && (
                <p className="text-red-400 text-sm">
                  ❌ Add NEXT_PUBLIC_SUPABASE_URL to .env.local
                </p>
              )}
              {!status.keyValid && (
                <p className="text-red-400 text-sm">
                  ❌ Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
                </p>
              )}
              {!status.canConnect && status.urlValid && status.keyValid && (
                <div className="text-red-400 text-sm space-y-1">
                  <p>❌ Cannot connect to Supabase. Possible causes:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>Internet connection issue</li>
                    <li>Supabase service is down</li>
                    <li>Invalid credentials</li>
                    <li>CORS issue</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="pt-4 border-t border-slate-700">
          <h3 className="text-slate-300 font-medium mb-2">Next Steps:</h3>
          <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://supabase.com/dashboard" target="_blank" className="text-brand-300 hover:underline">Supabase Dashboard</a></li>
            <li>Select your project</li>
            <li>Settings → API</li>
            <li>Copy Project URL and Anon Key</li>
            <li>Add to .env.local:
              <pre className="bg-slate-700/50 p-2 rounded mt-1 text-xs overflow-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
              </pre>
            </li>
            <li>Restart dev server: <code className="bg-slate-700/50 px-1 rounded text-xs">npm run dev</code></li>
          </ol>
        </div>

        {/* Back Button */}
        <div className="pt-4">
          <a
            href="/login"
            className="block text-center bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}
