'use client'

import { useState } from 'react'
import { Link2, Check, Copy } from 'lucide-react'
import { generateUpdateToken } from '@/actions/founder-updates'

interface Props {
  companyId: string
  existingToken: string | null
}

export default function UpdateLinkButton({ companyId, existingToken }: Props) {
  const [token, setToken] = useState(existingToken)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showLink, setShowLink] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const link = token ? `${appUrl}/updates/${token}` : null

  async function handleGenerate() {
    if (token) { setShowLink(true); return }
    setLoading(true)
    const result = await generateUpdateToken(companyId)
    if (result.token) setToken(result.token)
    setShowLink(true)
    setLoading(false)
  }

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
      >
        <Link2 size={12} /> {loading ? 'Generating…' : 'Update link'}
      </button>

      {showLink && link && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowLink(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-2xl shadow-xl ring-1 ring-black/[0.08] p-4">
            <p className="text-xs font-semibold text-slate-700 mb-2">Founder update link</p>
            <p className="text-xs text-slate-500 mb-3">
              Share this with the founder. They can submit metrics and updates without logging in.
            </p>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600 flex-1 truncate font-mono">{link}</p>
              <button
                onClick={copyLink}
                className="flex-shrink-0 p-1.5 text-slate-500 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
            {copied && <p className="text-xs text-emerald-600 mt-1.5">Copied to clipboard!</p>}
          </div>
        </>
      )}
    </div>
  )
}
