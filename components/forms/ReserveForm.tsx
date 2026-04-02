'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { upsertReserve } from '@/actions/reserves'
import type { Reserve } from '@/lib/types'

const ROUNDS = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Bridge']

interface Props {
  companyId: string
  companyName: string
  reserve?: Reserve
  onClose: () => void
}

const inp = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 focus:bg-white transition-all'
const lbl = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function ReserveForm({ companyId, companyName, reserve, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const num = (k: string) => Number(fd.get(k) as string) || 0

    const result = await upsertReserve(companyId, {
      reserved_amount: num('reserved_amount'),
      deployed_amount: num('deployed_amount'),
      target_round:    (fd.get('target_round') as string) || null,
      notes:           (fd.get('notes') as string) || null,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-500">
        Setting reserve for <span className="font-semibold text-slate-800">{companyName}</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Planned Reserve ($) *</label>
          <input
            name="reserved_amount"
            type="number"
            step="any"
            required
            defaultValue={reserve?.reserved_amount ?? ''}
            className={inp}
            placeholder="500000"
          />
        </div>
        <div>
          <label className={lbl}>Deployed ($)</label>
          <input
            name="deployed_amount"
            type="number"
            step="any"
            defaultValue={reserve?.deployed_amount ?? ''}
            className={inp}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <label className={lbl}>Target Round</label>
        <select name="target_round" defaultValue={reserve?.target_round ?? ''} className={inp}>
          <option value="">— Not specified —</option>
          {ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={reserve?.notes ?? ''}
          className={`${inp} resize-none`}
          placeholder="Reserve strategy rationale…"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1">Save reserve</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
