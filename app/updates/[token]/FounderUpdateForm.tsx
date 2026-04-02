'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { submitFounderUpdate } from '@/actions/founder-updates'

const inp = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white transition-all'
const lbl = 'block text-sm font-medium text-slate-700 mb-1.5'

interface Props {
  companyId: string
  companyName: string
}

export default function FounderUpdateForm({ companyId, companyName }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={26} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Update submitted!</h2>
        <p className="text-sm text-slate-500">
          Thank you — the Menomadin team will review your update shortly.
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const str = (k: string) => (fd.get(k) as string)?.trim() || null
    const num = (k: string) => { const v = fd.get(k) as string; return v ? Number(v) : null }

    const result = await submitFounderUpdate({
      company_id: companyId,
      date: (fd.get('date') as string) || new Date().toISOString().split('T')[0],
      highlights: str('highlights'),
      challenges: str('challenges'),
      next_quarter: str('next_quarter'),
      ask: str('ask'),
      arr: num('arr'),
      revenue: num('revenue'),
      burn_rate: num('burn_rate'),
      cash_runway: num('cash_runway'),
      headcount: num('headcount'),
      notes: str('notes'),
    })

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setDone(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-primary-50 rounded-xl px-4 py-3">
        <p className="text-xs text-primary-500 font-semibold">
          Submitting update for <span className="text-violet-800">{companyName}</span>
        </p>
      </div>

      <div>
        <label className={lbl}>Period (date)</label>
        <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className={inp} />
      </div>

      <div>
        <label className={lbl}>Highlights & wins *</label>
        <textarea name="highlights" required rows={3} className={`${inp} resize-none`} placeholder="Key achievements this period…" />
      </div>

      <div>
        <label className={lbl}>Challenges</label>
        <textarea name="challenges" rows={2} className={`${inp} resize-none`} placeholder="What challenges are you facing?" />
      </div>

      <div>
        <label className={lbl}>Next quarter priorities</label>
        <textarea name="next_quarter" rows={2} className={`${inp} resize-none`} placeholder="What are your main goals for next quarter?" />
      </div>

      <div>
        <label className={lbl}>Ask from Menomadin</label>
        <textarea name="ask" rows={2} className={`${inp} resize-none`} placeholder="Any specific help or introductions needed?" />
      </div>

      <hr className="border-slate-100" />
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Key Metrics (optional)</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>ARR ($)</label>
          <input name="arr" type="number" step="any" className={inp} placeholder="500000" />
        </div>
        <div>
          <label className={lbl}>Monthly Revenue ($)</label>
          <input name="revenue" type="number" step="any" className={inp} placeholder="42000" />
        </div>
        <div>
          <label className={lbl}>Burn Rate / mo ($)</label>
          <input name="burn_rate" type="number" step="any" className={inp} placeholder="80000" />
        </div>
        <div>
          <label className={lbl}>Cash Runway (months)</label>
          <input name="cash_runway" type="number" step="any" className={inp} placeholder="18" />
        </div>
        <div>
          <label className={lbl}>Headcount</label>
          <input name="headcount" type="number" className={inp} placeholder="25" />
        </div>
      </div>

      <div>
        <label className={lbl}>Additional notes</label>
        <textarea name="notes" rows={2} className={`${inp} resize-none`} placeholder="Anything else you'd like to share…" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5">{error}</p>}

      <Button type="submit" loading={loading} className="w-full">
        Submit update
      </Button>
    </form>
  )
}
