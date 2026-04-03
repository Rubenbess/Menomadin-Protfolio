'use client'

import { useState } from 'react'
import { createOptionPool, updateOptionPool } from '@/actions/option-pools'
import type { OptionPool } from '@/lib/types'
import Button from '@/components/ui/Button'

interface Props {
  companyId: string
  pool?: OptionPool | null
  onClose: () => void
}

const fi = 'w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500 focus:bg-white transition-all'

export default function OptionPoolForm({ companyId, pool, onClose }: Props) {
  const [name, setName]               = useState(pool?.name ?? 'ESOP')
  const [authorized, setAuthorized]   = useState(pool?.shares_authorized?.toString() ?? '')
  const [issued, setIssued]           = useState(pool?.shares_issued?.toString() ?? '0')
  const [pps, setPps]                 = useState(pool?.price_per_share?.toString() ?? '')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!authorized) return
    setLoading(true)
    setError(null)

    const data = {
      company_id:        companyId,
      name:              name.trim(),
      shares_authorized: parseInt(authorized),
      shares_issued:     parseInt(issued) || 0,
      price_per_share:   pps ? parseFloat(pps) : null,
    }

    const result = pool
      ? await updateOptionPool(pool.id, data)
      : await createOptionPool(data)

    setLoading(false)
    if (result.error) { setError(result.error); return }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="field-label">Pool Name</label>
        <input className={fi} value={name} onChange={e => setName(e.target.value)}
          placeholder="ESOP" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Shares Authorized <span className="text-red-500">*</span></label>
          <input type="number" className={fi} value={authorized} onChange={e => setAuthorized(e.target.value)}
            placeholder="1,000,000" min="0" step="1" required />
        </div>
        <div>
          <label className="field-label">Shares Issued / Granted</label>
          <input type="number" className={fi} value={issued} onChange={e => setIssued(e.target.value)}
            placeholder="0" min="0" step="1" />
        </div>
      </div>

      <div>
        <label className="field-label">Exercise Price / Strike ($)</label>
        <input type="number" className={fi} value={pps} onChange={e => setPps(e.target.value)}
          placeholder="e.g. 0.10" min="0" step="any" />
        <p className="text-[11px] text-neutral-500 mt-1">Leave blank if not yet set or mixed</p>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Saving…' : pool ? 'Save Changes' : 'Add Option Pool'}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
      </div>
    </form>
  )
}
