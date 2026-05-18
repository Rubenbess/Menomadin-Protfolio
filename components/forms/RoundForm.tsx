'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createRound, updateRound } from '@/actions/rounds'
import { inputClasses, labelClasses } from '@/lib/form-styles'
import type { Round } from '@/lib/types'

const ROUND_TYPE_SUGGESTIONS = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Growth', 'Bridge', 'Convertible Note', 'Other']

interface Props {
  companyId: string
  round?: Round
  onClose: () => void
}

const input = inputClasses
const label = labelClasses

export default function RoundForm({ companyId, round, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!round

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const data = {
      date:          fd.get('date')          as string,
      type:          fd.get('type')          as string,
      pre_money:     parseFloat(fd.get('pre_money')     as string) || 0,
      post_money:    parseFloat(fd.get('post_money')    as string) || 0,
      amount_raised: parseFloat(fd.get('amount_raised') as string) || 0,
      notes:         ((fd.get('notes') as string) ?? '').trim() || null,
    }

    const result = isEdit
      ? await updateRound(round.id, data)
      : await createRound({ company_id: companyId, ...data })

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
          <input name="date" type="date" required defaultValue={round?.date?.slice(0, 10)} className={input} />
        </div>
        <div>
          <label className={label}>Round Type *</label>
          <input
            name="type"
            type="text"
            required
            list="round-type-suggestions"
            defaultValue={round?.type ?? ''}
            className={input}
            placeholder="e.g. Series A, Bridge…"
          />
          <datalist id="round-type-suggestions">
            {ROUND_TYPE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={label}>Pre-money ($)</label>
          <input name="pre_money" type="number" min="0" step="any" defaultValue={round?.pre_money || ''} className={input} placeholder="5,000,000" />
        </div>
        <div>
          <label className={label}>Post-money ($)</label>
          <input name="post_money" type="number" min="0" step="any" defaultValue={round?.post_money || ''} className={input} placeholder="6,000,000" />
        </div>
        <div>
          <label className={label}>Amount Raised ($)</label>
          <input name="amount_raised" type="number" min="0" step="any" defaultValue={round?.amount_raised || ''} className={input} placeholder="1,000,000" />
        </div>
      </div>

      <div>
        <label className={label}>Notes</label>
        <textarea
          name="notes"
          rows={3}
          maxLength={5000}
          defaultValue={round?.notes ?? ''}
          className={input}
          placeholder="What happened during this round? Key terms, context, lead investor…"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5 ring-1 ring-red-200">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">{isEdit ? 'Save changes' : 'Add round'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
