'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createCapTableEntry } from '@/actions/cap-table'
import type { Round } from '@/lib/types'

interface Props {
  companyId: string
  rounds: Round[]
  onClose: () => void
}

const input = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all'
const label = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function CapTableForm({ companyId, rounds, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const roundId = fd.get('round_id') as string
    const result = await createCapTableEntry({
      company_id:           companyId,
      round_id:             roundId || null,
      shareholder_name:     fd.get('shareholder_name')     as string,
      ownership_percentage: parseFloat(fd.get('ownership_percentage') as string) || 0,
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
      <div>
        <label className={label}>Shareholder Name *</label>
        <input name="shareholder_name" required className={input} placeholder="Fund I" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Ownership % *</label>
          <input
            name="ownership_percentage"
            type="number"
            required
            min="0"
            max="100"
            step="0.01"
            className={input}
            placeholder="12.5"
          />
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

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">Add entry</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
