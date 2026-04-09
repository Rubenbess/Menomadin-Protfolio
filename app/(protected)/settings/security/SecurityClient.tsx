'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { ShieldCheck, ShieldOff, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import PermissionsManager from '@/components/PermissionsManager'

type Step = 'idle' | 'enrolling' | 'enrolled'

interface Factor {
  id: string
  friendly_name?: string
  factor_type: string
  status: string
  created_at: string
}

interface TOTPEnrollData {
  id: string
  totp: {
    qr_code: string
    secret: string
    uri: string
  }
}

export default function SecurityClient({ required = false }: { required?: boolean }) {
  const [factors, setFactors] = useState<Factor[]>([])
  const [step, setStep] = useState<Step>('idle')
  const [enrollData, setEnrollData] = useState<TOTPEnrollData | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadFactors() }, [])

  async function loadFactors() {
    const supabase = createClient()
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.totp ?? [])
  }

  async function startEnroll() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Menomadin Portfolio',
      friendlyName: 'Authenticator App',
    })
    setLoading(false)
    if (error || !data) { setError(error?.message ?? 'Failed to start enrollment'); return }
    setEnrollData(data as TOTPEnrollData)
    setStep('enrolling')
  }

  async function confirmEnroll() {
    if (!enrollData || code.length !== 6) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.id })
    if (cErr || !challenge) { setError(cErr?.message ?? 'Challenge failed'); setLoading(false); return }

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollData.id,
      challengeId: challenge.id,
      code: code.trim(),
    })

    setLoading(false)
    if (vErr) { setError('Incorrect code — try again'); setCode(''); return }

    setStep('enrolled')
    setSuccess('2FA enabled successfully! You will be asked for a code on every login.')
    await loadFactors()
  }

  async function removeFactor(factorId: string) {
    if (!confirm('Remove 2FA? You will only need your password to log in.')) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess('2FA has been removed from your account.')
    await loadFactors()
  }

  const hasActiveFactor = factors.some(f => f.status === 'verified')

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="page-header border-b border-neutral-200 dark:border-neutral-700">
        <div>
          <h1 className="page-title">Security</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Manage two-factor authentication for your account</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">

      {/* Required banner */}
      {required && !hasActiveFactor && (
        <div className="mb-5 flex items-start gap-3 bg-amber-50 ring-1 ring-amber-200 rounded-lg px-4 py-3.5">
          <ShieldOff size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">2FA is required to access this platform</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Set up two-factor authentication below to continue. You won&apos;t be able to access any other page until this is done.
            </p>
          </div>
        </div>
      )}

      {/* Status card */}
      <div className={`rounded-lg p-5 mb-6 flex items-start gap-4 ring-1 ${
        hasActiveFactor
          ? 'bg-emerald-50 ring-emerald-200'
          : 'bg-amber-50 ring-amber-200'
      }`}>
        {hasActiveFactor
          ? <ShieldCheck size={22} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          : <AlertCircle size={22} className="text-amber-500 flex-shrink-0 mt-0.5" />
        }
        <div>
          <p className={`text-sm font-semibold ${hasActiveFactor ? 'text-emerald-800' : 'text-amber-800'}`}>
            {hasActiveFactor ? '2FA is enabled' : '2FA is not enabled'}
          </p>
          <p className={`text-xs mt-0.5 ${hasActiveFactor ? 'text-emerald-700' : 'text-amber-700'}`}>
            {hasActiveFactor
              ? 'Your account is protected with an authenticator app.'
              : 'Add an extra layer of security. Recommended for all team members.'}
          </p>
        </div>
      </div>

      {success && (
        <div className="mb-5 flex items-center gap-3 bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-5 bg-red-50 ring-1 ring-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Active factors */}
      {hasActiveFactor && (
        <div className="card p-5 mb-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-3">Active authenticators</h2>
          <div className="space-y-2">
            {factors.filter(f => f.status === 'verified').map(f => (
              <div key={f.id} className="flex items-center justify-between py-2.5 px-3 bg-neutral-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={15} className="text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{f.friendly_name || 'Authenticator App'}</p>
                    <p className="text-xs text-neutral-500">
                      Added {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFactor(f.id)}
                  disabled={loading}
                  className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enroll flow */}
      {!hasActiveFactor && step === 'idle' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-neutral-900 mb-1">Set up authenticator app</h2>
          <p className="text-xs text-neutral-500 mb-5">
            Use Google Authenticator, Authy, or any TOTP app. You'll scan a QR code to link your account.
          </p>
          <Button onClick={startEnroll} loading={loading}>
            <ShieldCheck size={15} /> Enable 2FA
          </Button>
        </div>
      )}

      {step === 'enrolling' && enrollData && (
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 mb-1">Scan this QR code</h2>
            <p className="text-xs text-neutral-500">Open your authenticator app and scan the QR code below.</p>
          </div>

          {/* QR code — Supabase returns SVG string */}
          <div
            className="flex justify-center p-4 bg-white rounded-lg ring-1 ring-slate-200"
            dangerouslySetInnerHTML={{ __html: enrollData.totp.qr_code }}
          />

          <div className="bg-neutral-50 rounded-lg px-4 py-3">
            <p className="text-xs text-neutral-600 mb-1">Can't scan? Enter this key manually:</p>
            <p className="text-sm font-mono font-semibold text-neutral-900 tracking-wider break-all">
              {enrollData.totp.secret}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1.5">
              Enter the 6-digit code to confirm
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xl font-mono text-center tracking-[0.4em] text-neutral-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={confirmEnroll} loading={loading} disabled={code.length !== 6} className="flex-1">
              <ShieldCheck size={15} /> Confirm &amp; enable 2FA
            </Button>
            <Button variant="secondary" onClick={() => { setStep('idle'); setEnrollData(null); setCode('') }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === 'enrolled' && (
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <h2 className="text-sm font-semibold text-neutral-900 mb-1">2FA is now active</h2>
          <p className="text-xs text-neutral-500">Every login will now require your authenticator code.</p>
        </div>
      )}

      {/* Separator */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 my-8" />

      {/* Permissions Manager */}
      <PermissionsManager />
      </div>
    </div>
  )
}
