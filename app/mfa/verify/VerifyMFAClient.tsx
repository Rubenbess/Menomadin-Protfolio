'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { ShieldCheck, LogOut } from 'lucide-react'

export default function VerifyMFAClient() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totp = factors?.totp?.[0]
    if (!totp) { setError('No authenticator found. Please contact your admin.'); setLoading(false); return }

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
    if (cErr || !challenge) { setError(cErr?.message ?? 'Failed to start challenge'); setLoading(false); return }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challenge.id,
      code: code.trim(),
    })

    if (vErr) {
      setError('Incorrect code — try again')
      setCode('')
      setLoading(false)
      inputRef.current?.focus()
      return
    }

    window.location.href = '/dashboard'
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 60%), #f8fafc' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-white shadow-sm dark:shadow-md ring-1 ring-black/[0.06] mb-4 mx-auto">
            <ShieldCheck size={28} className="text-primary-500" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Two-factor authentication</h1>
          <p className="text-sm text-neutral-500 mt-1">Enter the 6-digit code from your authenticator app</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm dark:shadow-md border border-neutral-200 dark:border-neutral-700 p-7">
          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-800 mb-1.5">Authentication code</label>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xl font-mono text-center tracking-[0.4em] text-neutral-900 placeholder:text-slate-300 placeholder:tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 focus:bg-white transition-all"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 ring-1 ring-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        </div>

        <button
          onClick={handleSignOut}
          className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <LogOut size={13} /> Sign out and try another account
        </button>
      </div>
    </div>
  )
}
