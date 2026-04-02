'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createUpdate } from '@/actions/updates'

interface Props {
  companyId: string
  onClose: () => void
}

const inp = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all'
const lbl = 'block text-sm font-medium text-slate-700 mb-1.5'

const CATEGORIES = ['Fundraising', 'Product', 'Team', 'Regulatory', 'Commercial', 'Other']

const CATEGORY_COLORS: Record<string, string> = {
  Fundraising: 'bg-brand-100 text-brand-600',
  Product:     'bg-blue-100 text-blue-700',
  Team:        'bg-emerald-100 text-emerald-700',
  Regulatory:  'bg-amber-100 text-amber-700',
  Commercial:  'bg-cyan-100 text-cyan-700',
  Other:       'bg-slate-100 text-slate-700',
}

export { CATEGORY_COLORS }

export default function UpdateForm({ companyId, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)

    const result = await createUpdate({
      company_id: companyId,
      date:       fd.get('date') as string,
      category:   fd.get('category') as string,
      title:      fd.get('title') as string,
      notes:      (fd.get('notes') as string) || null,
    })

    if (result.error) { setError(result.error); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Date *</label>
          <input name="date" type="date" required className={inp} defaultValue={new Date().toISOString().split('T')[0]} />
        </div>
        <div>
          <label className={lbl}>Category *</label>
          <select name="category" required className={inp} defaultValue="Commercial">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Title *</label>
        <input name="title" required className={inp} placeholder="e.g. Closed Series A round" />
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea name="notes" className={`${inp} resize-none`} rows={4} placeholder="More detail about this update…" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1">Save Update</Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
