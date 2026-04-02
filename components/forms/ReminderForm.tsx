'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createReminder, updateReminder } from '@/actions/reminders'
import type { Reminder } from '@/lib/types'

const CATEGORIES = ['Follow-up', 'Board Meeting', 'Report Due', 'KPI Review', 'Contract Renewal', 'Call', 'Other']

interface Company { id: string; name: string }

interface Props {
  reminder?: Reminder
  companies: Company[]
  defaultCompanyId?: string
  onClose: () => void
}

const inp = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 focus:bg-white transition-all'
const lbl = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function ReminderForm({ reminder, companies, defaultCompanyId, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!reminder

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const data = {
      company_id: (fd.get('company_id') as string) || null,
      title:      fd.get('title') as string,
      due_date:   fd.get('due_date') as string,
      category:   fd.get('category') as string,
      notes:      (fd.get('notes') as string) || null,
    }

    const result = isEdit
      ? await updateReminder(reminder.id, data)
      : await createReminder(data)

    if (result.error) { setError(result.error); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={lbl}>Company (optional)</label>
        <select
          name="company_id"
          defaultValue={reminder?.company_id ?? defaultCompanyId ?? ''}
          className={inp}
        >
          <option value="">— No company —</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className={lbl}>Title *</label>
        <input
          name="title"
          required
          defaultValue={reminder?.title ?? ''}
          className={inp}
          placeholder="e.g. Follow up on term sheet"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Due Date *</label>
          <input
            name="due_date"
            type="date"
            required
            defaultValue={reminder?.due_date ?? new Date().toISOString().split('T')[0]}
            className={inp}
          />
        </div>
        <div>
          <label className={lbl}>Category</label>
          <select name="category" defaultValue={reminder?.category ?? 'Follow-up'} className={inp}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={reminder?.notes ?? ''}
          className={`${inp} resize-none`}
          placeholder="Additional context…"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1">
          {isEdit ? 'Save changes' : 'Add reminder'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
