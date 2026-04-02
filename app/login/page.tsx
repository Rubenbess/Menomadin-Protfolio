'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type Tab = 'signin' | 'signup' | 'reset'

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        setError('Email and password are required')
        setLoading(false)
        return
      }

      const supabase = createClient()

      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Supabase configuration is missing. Please check your environment variables.')
        setLoading(false)
        return
      }

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out — check your internet connection')), 15000)
      )

      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ])

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Verify user is authenticated before redirecting
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        window.location.href = '/dashboard'
      } else {
        setError('Authentication failed - please try again')
        setLoading(false)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong'
      console.error('Sign in error:', err)

      // Provide helpful error messages
      if (errMsg.includes('Failed to fetch')) {
        setError('Network error - check your internet connection and that Supabase is accessible')
      } else if (errMsg.includes('timed out')) {
        setError(errMsg)
      } else {
        setError(errMsg)
      }
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Email and password are required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({ email, password })

      setLoading(false)
      if (error) {
        if (error.message.includes('Failed to fetch')) {
          setError('Network error - check your internet connection')
        } else {
          setError(error.message)
        }
        return
      }

      setSuccess('Account created! Check your email to confirm, then sign in.')
      switchTab('signin')
    } catch (err) {
      console.error('Sign up error:', err)
      setError('An error occurred during sign up')
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Email is required')
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })

      setLoading(false)
      if (error) {
        if (error.message.includes('Failed to fetch')) {
          setError('Network error - check your internet connection')
        } else {
          setError(error.message)
        }
        return
      }

      setSuccess('Password reset email sent — check your inbox.')
    } catch (err) {
      console.error('Password reset error:', err)
      setError('An error occurred during password reset')
      setLoading(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'signin', label: 'Sign in' },
    { id: 'signup', label: 'Create account' },
    { id: 'reset', label: 'Reset password' },
  ]

  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 ' +
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 ' +
    'focus:border-primary-500 focus:bg-white transition-all'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 60%), #f8fafc',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-card ring-1 ring-black/[0.06] mb-4 mx-auto">
            <img
              src="/menomadin-icon.svg"
              alt="Menomadin Group"
              className="h-8 w-8"
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Menomadin Portfolio</h1>
          <p className="text-sm text-slate-400 mt-1">Internal access only</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/60">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`flex-1 py-3 text-xs font-semibold transition-all ${
                  tab === t.id
                    ? 'text-primary-500 border-b-2 border-primary-500 -mb-px bg-white'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-7">
            {/* Success message */}
            {success && (
              <div className="mb-5 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 ring-1 ring-emerald-200">
                {success}
              </div>
            )}

            {/* SIGN IN */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@fund.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 ring-1 ring-red-200">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl
                             hover:bg-primary-600 shadow-sm hover:shadow transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            )}

            {/* CREATE ACCOUNT */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="colleague@fund.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 ring-1 ring-red-200">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl
                             hover:bg-primary-600 shadow-sm hover:shadow transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            )}

            {/* RESET PASSWORD */}
            {tab === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4">
                <p className="text-sm text-slate-500 leading-relaxed">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@fund.com"
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 ring-1 ring-red-200">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl
                             hover:bg-primary-600 shadow-sm hover:shadow transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
