'use client'

import { useState, useEffect } from 'react'
import { Mail, CheckCircle2, AlertCircle, RefreshCw, Unlink, ExternalLink, Zap } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Integration {
  email: string
  last_scanned_at: string | null
  created_at: string
}

interface Props {
  searchParams: { success?: string; error?: string }
}

export default function EmailScannerClient({ searchParams }: Props) {
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (searchParams.success === 'connected') {
      setAlert({ type: 'success', message: 'Outlook connected successfully! The scanner will check your inbox every 15 minutes.' })
    } else if (searchParams.error) {
      const messages: Record<string, string> = {
        oauth_failed: 'Microsoft authorization was cancelled or failed. Please try again.',
        token_failed: 'Failed to retrieve access token from Microsoft. Please try again.',
        missing_config: 'Server configuration is missing. Contact your admin.',
      }
      setAlert({ type: 'error', message: messages[searchParams.error] ?? 'Something went wrong.' })
    }
  }, [searchParams])

  useEffect(() => {
    fetch('/api/auth/microsoft/status')
      .then(r => r.json() as Promise<{ integration: Integration | null }>)
      .then(d => { setIntegration(d?.integration ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDisconnect() {
    if (!confirm('Disconnect Outlook? The email scanner will stop running.')) return
    setDisconnecting(true)
    const res = await fetch('/api/auth/microsoft/disconnect', { method: 'POST' })
    if (res.ok) {
      setIntegration(null)
      setAlert({ type: 'success', message: 'Outlook disconnected.' })
    } else {
      setAlert({ type: 'error', message: 'Failed to disconnect. Try again.' })
    }
    setDisconnecting(false)
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="page-header border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="page-title">Email Scanner</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Automatically detect investment opportunities from your Outlook inbox
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">

      {alert && (
        <div className={`mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${
          alert.type === 'success'
            ? 'bg-emerald-50 ring-emerald-200'
            : 'bg-red-50 ring-red-200'
        }`}>
          {alert.type === 'success'
            ? <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            : <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          }
          <p className={`text-sm ${alert.type === 'success' ? 'text-emerald-800' : 'text-red-700'}`}>
            {alert.message}
          </p>
        </div>
      )}

      {/* Status card */}
      <div className={`rounded-2xl p-5 mb-6 flex items-start gap-4 ring-1 ${
        integration
          ? 'bg-emerald-50 ring-emerald-200'
          : 'bg-slate-50 ring-slate-200'
      }`}>
        <Mail size={22} className={`flex-shrink-0 mt-0.5 ${integration ? 'text-emerald-600' : 'text-slate-400'}`} />
        <div>
          <p className={`text-sm font-semibold ${integration ? 'text-emerald-800' : 'text-slate-700'}`}>
            {loading ? 'Loading…' : integration ? 'Outlook connected' : 'Not connected'}
          </p>
          <p className={`text-xs mt-0.5 ${integration ? 'text-emerald-700' : 'text-slate-500'}`}>
            {integration
              ? `Scanning ${integration.email} · Last run: ${formatDate(integration.last_scanned_at)}`
              : 'Connect your Outlook to automatically discover deal flow from your inbox.'
            }
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="card p-5 mb-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Zap size={15} className="text-gold-500" />
          How it works
        </h2>
        <ol className="space-y-2.5">
          {[
            'Connect your Microsoft Outlook account with read-only access.',
            'Every 15 minutes, the scanner reads new emails in your inbox.',
            'Claude AI analyzes each email to detect startup pitches and deal introductions.',
            'Confirmed opportunities are automatically added to your Pipeline as "Prospecting".',
            'Duplicates are skipped — existing companies are never added twice.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold-500/10 text-gold-500 text-[11px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-slate-600">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Action */}
      {!loading && (
        <div className="card p-5">
          {integration ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Connected account</p>
                  <p className="text-xs text-slate-500 mt-0.5">{integration.email}</p>
                </div>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1">
                  Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Connected</p>
                  <p className="text-xs text-slate-700 mt-0.5">{formatDate(integration.created_at)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Last scan</p>
                  <p className="text-xs text-slate-700 mt-0.5">{formatDate(integration.last_scanned_at)}</p>
                </div>
              </div>
              <div className="flex gap-2.5 pt-1">
                <Button
                  variant="secondary"
                  onClick={handleDisconnect}
                  loading={disconnecting}
                  className="flex-1"
                >
                  <Unlink size={14} /> Disconnect
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.open('/pipeline', '_self')}
                  className="flex-1"
                >
                  <RefreshCw size={14} /> View pipeline
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Connect Outlook</h2>
              <p className="text-xs text-slate-400 mb-4">
                You&#39;ll be redirected to Microsoft to authorize read-only access to your inbox.
                We never send emails or modify your mailbox.
              </p>
              <div className="flex gap-2.5">
                <Button onClick={() => window.location.href = '/api/auth/microsoft/connect'}>
                  <Mail size={15} /> Connect Outlook
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.open('https://portal.azure.com', '_blank')}
                >
                  <ExternalLink size={14} /> Azure Portal
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
