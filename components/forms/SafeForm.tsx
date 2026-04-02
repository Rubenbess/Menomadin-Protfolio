'use client'

import { useState } from 'react'
import { createSafe, updateSafe } from '@/actions/safes'
import type { Safe } from '@/lib/types'
import Button from '@/components/ui/Button'

interface Props {
  companyId: string
  safe?: Safe | null
  onClose: () => void
}

export default function SafeForm({ companyId, safe, onClose }: Props) {
  const [date, setDate]                   = useState(safe?.date ?? '')
  const [amount, setAmount]               = useState(safe?.investment_amount?.toString() ?? '')
  const [cap, setCap]                     = useState(safe?.valuation_cap?.toString() ?? '')
  const [discount, setDiscount]           = useState(safe?.discount_rate?.toString() ?? '')
  const [hasMfn, setHasMfn]               = useState(safe?.has_mfn ?? false)
  const [hasProRata, setHasProRata]       = useState(safe?.has_pro_rata ?? false)
  const [notes, setNotes]                 = useState(safe?.notes ?? '')
  const [error, setError]                 = useState<string | null>(null)
  const [loading, setLoading]             = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !amount) return
    setLoading(true)
    setError(null)

    const data = {
      company_id:        companyId,
      date,
      investment_amount: parseFloat(amount),
      valuation_cap:     cap     ? parseFloat(cap)      : null,
      discount_rate:     discount ? parseFloat(discount) : null,
      has_mfn:           hasMfn,
      has_pro_rata:      hasProRata,
      notes:             notes.trim() || null,
    }

    const result = safe
      ? await updateSafe(safe.id, data)
      : await createSafe(data)

    setLoading(false)
    if (result.error) { setError(result.error); return }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Date <span className="text-red-500">*</span></label>
          <input type="date" className="field-input" value={date}
            onChange={e => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="field-label">Investment Amount ($) <span className="text-red-500">*</span></label>
          <input type="number" className="field-input" placeholder="e.g. 500000"
            value={amount} onChange={e => setAmount(e.target.value)} required min="0" step="any" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Valuation Cap ($)</label>
          <input type="number" className="field-input" placeholder="e.g. 8000000"
            value={cap} onChange={e => setCap(e.target.value)} min="0" step="any" />
          <p className="text-[11px] text-slate-400 mt-1">Leave blank if no cap</p>
        </div>
        <div>
          <label className="field-label">Discount Rate (%)</label>
          <input type="number" className="field-input" placeholder="e.g. 20"
            value={discount} onChange={e => setDiscount(e.target.value)} min="0" max="100" step="any" />
          <p className="text-[11px] text-slate-400 mt-1">Leave blank if no discount</p>
        </div>
      </div>

      <div className="flex gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-primary-500"
            checked={hasMfn} onChange={e => setHasMfn(e.target.checked)} />
          <span className="text-sm text-slate-700 font-medium">MFN Clause</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-primary-500"
            checked={hasProRata} onChange={e => setHasProRata(e.target.checked)} />
          <span className="text-sm text-slate-700 font-medium">Pro-rata Rights</span>
        </label>
      </div>

      <div>
        <label className="field-label">Notes</label>
        <textarea className="field-input min-h-[72px] resize-none" placeholder="Optional notes..."
          value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Saving…' : safe ? 'Save Changes' : 'Add SAFE'}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
      </div>
    </form>
  )
}
