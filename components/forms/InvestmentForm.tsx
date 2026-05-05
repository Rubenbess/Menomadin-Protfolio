'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createInvestment, updateInvestment } from '@/actions/investments'
import { inputClasses, labelClasses } from './inputStyles'
import type { Round, LegalEntity, Investment } from '@/lib/types'

const INSTRUMENTS = ['SAFE', 'Equity', 'Note', 'Warrant']

interface Props {
  companyId: string
  rounds: Round[]
  legalEntities: LegalEntity[]
  investment?: Investment
  onClose: () => void
}

const input = inputClasses
const label = labelClasses

export default function InvestmentForm({ companyId, rounds, legalEntities, investment, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [instrument, setInstrument] = useState(investment?.instrument ?? 'SAFE')
  const isEdit = !!investment

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const legalEntity = fd.get('legal_entity') as string
    const data = {
      date:          fd.get('date') as string,
      amount:        parseFloat(fd.get('amount') as string) || 0,
      instrument:    fd.get('instrument') as string,
      valuation_cap: fd.get('valuation_cap') ? parseFloat(fd.get('valuation_cap') as string) : null,
      legal_entity:  legalEntity || null,
    }

    const result = isEdit
      ? await updateInvestment(investment.id, data)
      : await createInvestment({
          company_id: companyId,
          round_id: (fd.get('round_id') as string) || null,
          ...data,
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
          <input name="date" type="date" required defaultValue={investment?.date?.slice(0, 10)} className={input} />
        </div>
        <div>
          <label className={label}>Amount ($) *</label>
          <input name="amount" type="number" required min="0" step="any" defaultValue={investment?.amount || ''} className={input} placeholder="250,000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Instrument *</label>
          <select
            name="instrument"
            required
            value={instrument}
            onChange={(e) => setInstrument(e.target.value as typeof instrument)}
            className={input}
          >
            {INSTRUMENTS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Legal Entity</label>
          <select name="legal_entity" defaultValue={investment?.legal_entity ?? ''} className={input}>
            <option value="">— Unassigned —</option>
            {legalEntities.map(e => (
              <option key={e.id} value={e.name}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!isEdit && (
        <div>
          <label className={label}>Round (optional)</label>
          <select name="round_id" className={input}>
            <option value="">— None —</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>{r.type} ({r.date.slice(0, 7)})</option>
            ))}
          </select>
        </div>
      )}

      {(instrument === 'SAFE' || instrument === 'Note') && (
        <div>
          <label className={label}>Valuation Cap ($)</label>
          <input name="valuation_cap" type="number" min="0" step="any" defaultValue={investment?.valuation_cap || ''} className={input} placeholder="10,000,000" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5 ring-1 ring-red-200">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">{isEdit ? 'Save changes' : 'Add investment'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
