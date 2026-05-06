'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { inputClasses } from '@/lib/form-styles'

type Tab = 'signin' | 'signup' | 'reset' | 'recovery'

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Bug 5 fix: detect PASSWORD_RECOVERY auth event and show set-new-password form
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setTab('recovery')
        setError('')
        setSuccess('')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

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

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Supabase configuration is missing. Please check your environment variables.')
        setLoading(false)
        return
      }

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out — check your internet connection')), 15000)
      )

      // Bug 9 fix: use the session returned by signInWithPassword directly — no extra getUser() call
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ]) as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data?.user) {
        window.location.href = '/dashboard'
      } else {
        setError('Authentication failed - please try again')
        setLoading(false)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong'
      console.error('Sign in error:', err)
      if (errMsg.includes('Failed to fetch')) {
        setError('Network error - check your internet connection and that Supabase is accessible')
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

      // Bug 6 fix: pass emailRedirectTo so confirmation links point to this environment
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
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

  // Bug 5 fix: handler for setting a new password after arriving via reset link
  async function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!newPassword || !confirmNewPassword) {
      setError('Both fields are required')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      setLoading(false)
      if (error) {
        setError(error.message)
        return
      }

      setSuccess('Password updated successfully. Redirecting…')
      setTimeout(() => { window.location.href = '/dashboard' }, 1500)
    } catch (err) {
      console.error('Set password error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const visibleTabs: { id: Tab; label: string }[] = [
    { id: 'signin', label: 'Sign in' },
    { id: 'signup', label: 'Create account' },
    { id: 'reset', label: 'Reset password' },
  ]

  const inputClass = inputClasses

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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-white shadow-sm dark:shadow-md ring-1 ring-black/[0.06] mb-4 mx-auto">
            <img
              src="/menomadin-icon.svg"
              alt="Menomadin Group"
              className="h-8 w-8"
            />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Menomadin Portfolio</h1>
          <p className="text-sm text-neutral-500 mt-1">Internal access only</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm dark:shadow-md border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {/* Tabs — hidden on recovery screen */}
          {tab !== 'recovery' && (
            <div className="flex border-b border-neutral-200 bg-neutral-50/60">
              {visibleTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => switchTab(t.id)}
                  className={`flex-1 py-3 text-xs font-semibold transition-all ${
                    tab === t.id
                      ? 'text-primary-500 border-b-2 border-primary-500 -mb-px bg-white'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-7">
            {/* Success message */}
            {success && (
              <div className="mb-5 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 ring-1 ring-emerald-200">
                {success}
              </div>
            )}

            {/* SIGN IN */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Email</label>
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
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Password</label>
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
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 ring-1 ring-red-200">
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
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Email</label>
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
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Password</label>
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
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Confirm password</label>
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
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 ring-1 ring-red-200">
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
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Email</label>
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
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 ring-1 ring-red-200">
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

            {/* SET NEW PASSWORD — shown when user arrives via password reset link */}
            {tab === 'recovery' && (
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="mb-2">
                  <p className="text-sm font-semibold text-neutral-900">Set a new password</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Choose a password at least 6 characters long.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">New password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Min. 6 characters"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-800 mb-1.5">Confirm new password</label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 ring-1 ring-red-200">
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
                  {loading ? 'Saving…' : 'Set new password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
