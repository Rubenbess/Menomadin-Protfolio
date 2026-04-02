'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createInvestment } from '@/actions/investments'
import type { Round } from '@/lib/types'

const INSTRUMENTS = ['SAFE', 'Equity', 'Note', 'Warrant']

interface Props {
  companyId: string
  rounds: Round[]
  onClose: () => void
}

const input = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all'
const label = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function InvestmentForm({ companyId, rounds, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [instrument, setInstrument] = useState('SAFE')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const roundId = fd.get('round_id') as string
    const result = await createInvestment({
      company_id:    companyId,
      round_id:      roundId || null,
      date:          fd.get('date')   as string,
      amount:        parseFloat(fd.get('amount') as string) || 0,
      instrument:    fd.get('instrument') as string,
      valuation_cap: fd.get('valuation_cap')
        ? parseFloat(fd.get('valuation_cap') as string)
        : null,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Date *</label>
          <input name="date" type="date" required className={input} />
        </div>
        <div>
          <label className={label}>Amount ($) *</label>
          <input name="amount" type="number" required min="0" step="any" className={input} placeholder="250,000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Instrument *</label>
          <select
            name="instrument"
            required
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className={input}
          >
            {INSTRUMENTS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Round (optional)</label>
          <select name="round_id" className={input}>
            <option value="">— None —</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>{r.type} ({r.date.slice(0, 7)})</option>
            ))}
          </select>
        </div>
      </div>

      {(instrument === 'SAFE' || instrument === 'Note') && (
        <div>
          <label className={label}>Valuation Cap ($)</label>
          <input name="valuation_cap" type="number" min="0" step="any" className={input} placeholder="10,000,000" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">Add investment</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
