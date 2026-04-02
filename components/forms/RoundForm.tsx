'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createRound } from '@/actions/rounds'

const ROUND_TYPES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Bridge', 'Other']

interface Props {
  companyId: string
  onClose: () => void
}

const input = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white transition-all'
const label = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function RoundForm({ companyId, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const result = await createRound({
      company_id:    companyId,
      date:          fd.get('date')          as string,
      type:          fd.get('type')          as string,
      pre_money:     parseFloat(fd.get('pre_money')     as string) || 0,
      post_money:    parseFloat(fd.get('post_money')    as string) || 0,
      amount_raised: parseFloat(fd.get('amount_raised') as string) || 0,
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
          <label className={label}>Round Type *</label>
          <select name="type" required defaultValue="" className={input}>
            <option value="" disabled>Select…</option>
            {ROUND_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={label}>Pre-money ($)</label>
          <input name="pre_money" type="number" min="0" step="any" className={input} placeholder="5,000,000" />
        </div>
        <div>
          <label className={label}>Post-money ($)</label>
          <input name="post_money" type="number" min="0" step="any" className={input} placeholder="6,000,000" />
        </div>
        <div>
          <label className={label}>Amount Raised ($)</label>
          <input name="amount_raised" type="number" min="0" step="any" className={input} placeholder="1,000,000" />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">Add round</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
