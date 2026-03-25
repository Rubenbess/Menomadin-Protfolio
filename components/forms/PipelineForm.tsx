'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createPipelineEntry, updatePipelineEntry } from '@/actions/pipeline'
import type { PipelineEntry } from '@/lib/types'

const SECTORS = ['SaaS', 'Fintech', 'Healthtech', 'Cleantech', 'Consumer', 'Deep Tech', 'Marketplace', 'Agritech', 'Other']
const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth']
const SOURCES = ['Inbound', 'Network Referral', 'Conference', 'Accelerator', 'Cold Outreach', 'Co-investor', 'Other']

interface Props {
  entry?: PipelineEntry
  defaultStatus?: string
  stageNames?: string[]
  onClose: () => void
}

const inp = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all'
const lbl = 'block text-sm font-medium text-slate-700 mb-1.5'

export default function PipelineForm({ entry, defaultStatus, stageNames, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [score, setScore] = useState(entry?.internal_score ?? 0)
  const [hoverScore, setHoverScore] = useState(0)

  const isEdit = !!entry

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const num = (k: string) => { const v = fd.get(k) as string; return v ? Number(v) : null }

    const data = {
      name:           fd.get('name') as string,
      sector:         fd.get('sector') as string,
      stage:          fd.get('stage') as string,
      status:         fd.get('status') as string,
      notes:          (fd.get('notes') as string) || null,
      hq:             (fd.get('hq') as string) || null,
      fundraising_ask: num('fundraising_ask'),
      lead_partner:   (fd.get('lead_partner') as string) || null,
      source:         (fd.get('source') as string) || null,
      internal_score: score || null,
      next_steps:     (fd.get('next_steps') as string) || null,
    }

    const result = isEdit
      ? await updatePipelineEntry(entry.id, data)
      : await createPipelineEntry(data)

    if (result.error) { setError(result.error); setLoading(false); return }
    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={lbl}>Company Name *</label>
        <input name="name" required defaultValue={entry?.name} className={inp} placeholder="Acme Corp" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Sector</label>
          <select name="sector" defaultValue={entry?.sector ?? ''} className={inp}>
            <option value="">—</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Geography / HQ</label>
          <input name="hq" defaultValue={entry?.hq ?? ''} className={inp} placeholder="Tel Aviv, Israel" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Round Stage</label>
          <select name="stage" defaultValue={entry?.stage ?? ''} className={inp}>
            <option value="">—</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Pipeline Stage *</label>
          <select
            name="status"
            required
            defaultValue={entry?.status ?? defaultStatus ?? stageNames?.[0] ?? ''}
            className={inp}
          >
            {(stageNames ?? []).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Fundraising Ask ($)</label>
          <input name="fundraising_ask" type="number" step="any" defaultValue={entry?.fundraising_ask ?? ''} className={inp} placeholder="5000000" />
        </div>
        <div>
          <label className={lbl}>Source</label>
          <select name="source" defaultValue={entry?.source ?? ''} className={inp}>
            <option value="">—</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Lead Partner / Owner</label>
        <input name="lead_partner" defaultValue={entry?.lead_partner ?? ''} className={inp} placeholder="Name" />
      </div>

      <div>
        <label className={lbl}>Internal Score</label>
        <div className="flex gap-1.5 mt-1">
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHoverScore(i)}
              onMouseLeave={() => setHoverScore(0)}
              onClick={() => setScore(score === i ? 0 : i)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <svg viewBox="0 0 24 24" className={`w-6 h-6 transition-colors ${i <= (hoverScore || score) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </button>
          ))}
          {score > 0 && (
            <span className="text-xs text-slate-400 self-center ml-1">{score}/5</span>
          )}
        </div>
      </div>

      <div>
        <label className={lbl}>Next Steps</label>
        <textarea name="next_steps" rows={2} defaultValue={entry?.next_steps ?? ''} className={`${inp} resize-none`} placeholder="Schedule founder call, review deck…" />
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea name="notes" rows={3} defaultValue={entry?.notes ?? ''} className={`${inp} resize-none`} placeholder="Add any context…" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {isEdit ? 'Save changes' : 'Add to pipeline'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}
