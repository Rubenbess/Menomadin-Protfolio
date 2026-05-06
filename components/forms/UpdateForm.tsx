'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createUpdate, updateUpdate } from '@/actions/updates'
import { inputClasses, labelClasses } from '@/lib/form-styles'
import type { CompanyUpdate } from '@/lib/types'

interface Props {
  companyId: string
  update?: CompanyUpdate
  onClose: () => void
}

const inp = inputClasses
const lbl = labelClasses

const CATEGORIES = ['Fundraising', 'Product', 'Team', 'Regulatory', 'Commercial', 'Other']

const CATEGORY_COLORS: Record<string, string> = {
  Fundraising: 'bg-gold-100 text-primary-600',
  Product:     'bg-blue-100 text-blue-700',
  Team:        'bg-emerald-100 text-emerald-700',
  Regulatory:  'bg-amber-100 text-amber-700',
  Commercial:  'bg-cyan-100 text-cyan-700',
  Other:       'bg-neutral-100 text-neutral-800',
}

export { CATEGORY_COLORS }

export default function UpdateForm({ companyId, update, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!update

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)

    const data = {
      date:     fd.get('date') as string,
      category: fd.get('category') as string,
      title:    fd.get('title') as string,
      notes:    (fd.get('notes') as string) || null,
    }

    const result = isEdit
      ? await updateUpdate(update.id, data)
      : await createUpdate({ company_id: companyId, ...data })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Date *</label>
          <input name="date" type="date" required className={inp} defaultValue={update?.date?.slice(0, 10) ?? new Date().toISOString().split('T')[0]} />
        </div>
        <div>
          <label className={lbl}>Category *</label>
          <select name="category" required className={inp} defaultValue={update?.category ?? 'Commercial'}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Title *</label>
        <input name="title" required className={inp} placeholder="e.g. Closed Series A round" defaultValue={update?.title ?? ''} />
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea name="notes" className={`${inp} resize-none`} rows={4} placeholder="More detail about this update…" defaultValue={update?.notes ?? ''} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2.5 ring-1 ring-red-200">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1">{isEdit ? 'Save changes' : 'Save Update'}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
