'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Paperclip, ExternalLink, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { createPipelineEntry, updatePipelineEntry } from '@/actions/pipeline'
import type { PipelineEntry } from '@/lib/types'

const BASE_SECTORS = ['SaaS', 'Fintech', 'Healthtech', 'Cleantech', 'Consumer', 'Deep Tech', 'Marketplace', 'Agritech', 'Cybersecurity', 'EdTech', 'Other']
const STAGES  = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth']
const SOURCES = ['Inbound', 'Network Referral', 'Conference', 'Accelerator', 'Cold Outreach', 'Co-investor', 'Other']
const PASS_REASONS = ['Team concerns', 'Market too small', 'Valuation too high', 'No traction', 'Not strategic fit', 'Too early', 'Too late', 'Competitive landscape', 'Other']
const LS_KEY  = 'pipeline_custom_sectors'

const SCORE_DIMS = [
  { key: 'score_team',     label: 'Team',              description: '1 = weak  · 5 = exceptional' },
  { key: 'score_market',   label: 'Market Size',       description: '1 = niche · 5 = >$10B TAM' },
  { key: 'score_traction', label: 'Traction',          description: '1 = idea  · 5 = strong metrics' },
  { key: 'score_fit',      label: 'Strategic Fit',     description: '1 = low   · 5 = perfect fit' },
] as const

const inp = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all'
const lbl = 'block text-sm font-medium text-slate-700 mb-1.5'

type ScoreKey = typeof SCORE_DIMS[number]['key']

interface Props {
  entry?: PipelineEntry
  defaultStatus?: string
  stageNames?: string[]
  onClose: () => void
}

function StarRating({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span className="text-xs text-slate-400">{description}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(value === i ? 0 : i)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <svg viewBox="0 0 24 24" className={`w-5 h-5 transition-colors ${i <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}>
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        ))}
        {value > 0 && <span className="text-xs text-slate-400 self-center ml-1">{value}/5</span>}
      </div>
    </div>
  )
}

export default function PipelineForm({ entry, defaultStatus, stageNames, onClose }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [status, setStatus]   = useState(entry?.status ?? defaultStatus ?? stageNames?.[0] ?? '')

  // 4-dimension scores
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    score_team:     entry?.score_team     ?? 0,
    score_market:   entry?.score_market   ?? 0,
    score_traction: entry?.score_traction ?? 0,
    score_fit:      entry?.score_fit      ?? 0,
  })

  // Weighted average (equal weights for now)
  const filledDims  = Object.values(scores).filter(v => v > 0)
  const compositeScore = filledDims.length > 0
    ? Math.round(filledDims.reduce((s, v) => s + v, 0) / filledDims.length * 10) / 10
    : 0

  // Sectors
  const [customSectors, setCustomSectors]     = useState<string[]>([])
  const [showSectorInput, setShowSectorInput] = useState(false)
  const [newSector, setNewSector]             = useState('')
  const [selectedSector, setSelectedSector]   = useState(entry?.sector ?? '')

  // Deck
  const [deckFile, setDeckFile]     = useState<File | null>(null)
  const [deckUrl, setDeckUrl]       = useState<string | null>(entry?.deck_url ?? null)
  const [removeDeck, setRemoveDeck] = useState(false)

  const isEdit = !!entry

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
      setCustomSectors(stored)
    } catch { /* ignore */ }
  }, [])

  const allSectors = [...BASE_SECTORS, ...customSectors]

  function addCustomSector() {
    const s = newSector.trim()
    if (!s || allSectors.includes(s)) return
    const updated = [...customSectors, s]
    setCustomSectors(updated)
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
    setSelectedSector(s)
    setNewSector('')
    setShowSectorInput(false)
  }

  function handleDeckChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setDeckFile(file)
    setRemoveDeck(false)
  }

  async function uploadDeck(entryId: string): Promise<{ url: string | null; error: string | null }> {
    if (!deckFile) return { url: removeDeck ? null : deckUrl, error: null }
    const supabase = createClient()
    const ext  = deckFile.name.split('.').pop()
    const path = `${entryId}.${ext}`
    const { error } = await supabase.storage.from('decks').upload(path, deckFile, { upsert: true })
    if (error) return { url: null, error: `Deck upload failed: ${error.message}` }
    const { data } = supabase.storage.from('decks').getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd  = new FormData(e.currentTarget)
    const num = (k: string) => { const v = fd.get(k) as string; return v ? Number(v) : null }
    const str = (k: string) => (fd.get(k) as string) || null

    const data = {
      name:            fd.get('name') as string,
      sector:          selectedSector,
      stage:           fd.get('stage') as string,
      status,
      notes:           str('notes'),
      hq:              str('hq'),
      fundraising_ask: num('fundraising_ask'),
      lead_partner:    str('lead_partner'),
      source:          str('source'),
      internal_score:  compositeScore || null,
      score_team:      scores.score_team     || null,
      score_market:    scores.score_market   || null,
      score_traction:  scores.score_traction || null,
      score_fit:       scores.score_fit      || null,
      pass_reason:     status === 'passed' ? str('pass_reason') : null,
      referred_by:     str('referred_by'),
      next_steps:      str('next_steps'),
      deck_url:        deckFile ? (entry?.deck_url ?? null) : (removeDeck ? null : deckUrl),
    }

    let entryId = entry?.id ?? ''

    if (isEdit) {
      const result = await updatePipelineEntry(entry.id, data)
      if (result.error) { setError(result.error); setLoading(false); return }
    } else {
      const result = await createPipelineEntry(data)
      if (result.error || !result.id) { setError(result.error ?? 'Failed to create'); setLoading(false); return }
      entryId = result.id
    }

    if (deckFile || removeDeck) {
      const { url, error: uploadErr } = await uploadDeck(entryId)
      if (uploadErr) { setError(uploadErr); setLoading(false); return }
      await updatePipelineEntry(entryId, { ...data, deck_url: url })
    }

    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={lbl}>Company Name *</label>
        <input name="name" required defaultValue={entry?.name} className={inp} placeholder="Acme Corp" />
      </div>

      {/* Sector + HQ */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Sector</label>
          <select value={selectedSector} onChange={e => setSelectedSector(e.target.value)} className={inp}>
            <option value="">—</option>
            {allSectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {showSectorInput ? (
            <div className="flex gap-1.5 mt-1.5">
              <input
                type="text"
                value={newSector}
                onChange={e => setNewSector(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSector() } }}
                className={inp + ' py-1.5 text-xs'}
                placeholder="New sector name"
                autoFocus
              />
              <button type="button" onClick={addCustomSector} className="px-2.5 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 transition-colors flex-shrink-0">Add</button>
              <button type="button" onClick={() => { setShowSectorInput(false); setNewSector('') }} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"><X size={14} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowSectorInput(true)} className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-brand-500 transition-colors">
              <Plus size={12} /> Add custom sector
            </button>
          )}
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
          <select value={status} onChange={e => setStatus(e.target.value)} required className={inp}>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Lead Partner / Owner</label>
          <input name="lead_partner" defaultValue={entry?.lead_partner ?? ''} className={inp} placeholder="Name" />
        </div>
        <div>
          <label className={lbl}>Referred By</label>
          <input name="referred_by" defaultValue={entry?.referred_by ?? ''} className={inp} placeholder="Contact name or firm" />
        </div>
      </div>

      {/* Deal Scoring Rubric */}
      <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Deal Score</p>
          {compositeScore > 0 && (
            <span className={`text-sm font-bold tabular-nums ${
              compositeScore >= 4 ? 'text-emerald-600' :
              compositeScore >= 3 ? 'text-amber-600' : 'text-red-500'
            }`}>
              {compositeScore}/5 avg
            </span>
          )}
        </div>
        {SCORE_DIMS.map(dim => (
          <StarRating
            key={dim.key}
            label={dim.label}
            description={dim.description}
            value={scores[dim.key]}
            onChange={v => setScores(prev => ({ ...prev, [dim.key]: v }))}
          />
        ))}
      </div>

      {/* Pass reason (only when status = passed) */}
      {status === 'passed' && (
        <div>
          <label className={lbl}>Pass Reason</label>
          <select name="pass_reason" defaultValue={entry?.pass_reason ?? ''} className={inp}>
            <option value="">—</option>
            {PASS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      {/* Deck upload */}
      <div>
        <label className={lbl}>Pitch Deck</label>
        <input ref={fileInputRef} type="file" accept=".pdf,.ppt,.pptx" onChange={handleDeckChange} className="hidden" />
        {deckFile ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-50 border border-violet-200 rounded-xl">
            <Paperclip size={14} className="text-brand-500 flex-shrink-0" />
            <span className="text-xs text-brand-600 flex-1 truncate">{deckFile.name}</span>
            <button type="button" onClick={() => { setDeckFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        ) : deckUrl && !removeDeck ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <Paperclip size={14} className="text-slate-400 flex-shrink-0" />
            <a href={deckUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline flex-1 truncate flex items-center gap-1">
              View current deck <ExternalLink size={11} />
            </a>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-slate-500 hover:text-brand-500 transition-colors flex-shrink-0">Replace</button>
            <button type="button" onClick={() => setRemoveDeck(true)} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"><Trash2 size={13} /></button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-200 hover:text-brand-500 transition-colors"
          >
            <Paperclip size={14} />
            Attach deck (PDF, PPT, PPTX)
          </button>
        )}
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
