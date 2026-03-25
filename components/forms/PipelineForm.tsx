'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createPipelineEntry, updatePipelineEntry } from '@/actions/pipeline'
import type { PipelineEntry } from '@/lib/types'

const SECTORS = ['SaaS', 'Fintech', 'Healthtech', 'Cleantech', 'Consumer', 'Deep Tech', 'Marketplace', 'Other']
const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth']

interface Props {
  entry?: PipelineEntry
  defaultStatus?: string
  stageNames?: string[]
  onClose: () => void
}

const input = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all'
const label = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function PipelineForm({ entry, defaultStatus, stageNames, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!entry

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const data = {
      name:   fd.get('name')   as string,
      sector: fd.get('sector') as string,
      stage:  fd.get('stage')  as string,
      status: fd.get('status') as string,
      notes:  (fd.get('notes') as string) || null,
    }

    const result = isEdit
      ? await updatePipelineEntry(entry.id, data)
      : await createPipelineEntry(data)

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
        <label className={label}>Company Name *</label>
        <input name="name" required defaultValue={entry?.name} className={input} placeholder="Acme Corp" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={label}>Sector</label>
          <select name="sector" defaultValue={entry?.sector ?? ''} className={input}>
            <option value="">—</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className={label}>Round</label>
          <select name="stage" defaultValue={entry?.stage ?? ''} className={input}>
            <option value="">—</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className={label}>Pipeline stage *</label>
          <select
            name="status"
            required
            defaultValue={entry?.status ?? defaultStatus ?? stageNames?.[0] ?? ''}
            className={input}
          >
            {(stageNames ?? []).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={entry?.notes ?? ''}
          className={`${input} resize-none`}
          placeholder="Add any context…"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {isEdit ? 'Save changes' : 'Add to pipeline'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
