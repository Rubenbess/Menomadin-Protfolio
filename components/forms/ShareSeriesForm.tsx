'use client'

import { useState } from 'react'
import { createShareSeries, updateShareSeries } from '@/actions/share-series'
import type { ShareSeries, Round } from '@/lib/types'
import Button from '@/components/ui/Button'
import { inputClasses } from '@/lib/form-styles'

interface Props {
  companyId: string
  rounds: Round[]
  series?: ShareSeries | null
  onClose: () => void
}

const fi = inputClasses

export default function ShareSeriesForm({ companyId, rounds, series, onClose }: Props) {
  const [holderName, setHolderName]       = useState(series?.holder_name ?? '')
  const [shareClass, setShareClass]       = useState(series?.share_class ?? 'Common')
  const [isPreferred, setIsPreferred]     = useState(series?.is_preferred ?? false)
  const [shares, setShares]               = useState(series?.shares?.toString() ?? '')
  const [pps, setPps]                     = useState(series?.price_per_share?.toString() ?? '')
  const [investedAmount, setInvestedAmount] = useState(series?.invested_amount?.toString() ?? '')
  const [roundId, setRoundId]             = useState(series?.round_id ?? '')
  const [liqMult, setLiqMult]             = useState(series?.liquidation_pref_mult?.toString() ?? '1')
  const [seniority, setSeniority]         = useState(series?.liquidation_seniority?.toString() ?? '1')
  const [isParticipating, setIsParticipating] = useState(series?.is_participating ?? false)
  const [partCapMult, setPartCapMult]     = useState(series?.participation_cap_mult?.toString() ?? '')
  const [conversionRatio, setConversionRatio] = useState(series?.conversion_ratio?.toString() ?? '1')
  const [antiDilution, setAntiDilution]   = useState(series?.anti_dilution ?? 'broad_based_wa')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!holderName || !shares) return
    setLoading(true)
    setError(null)

    const data = {
      company_id:            companyId,
      round_id:              roundId || null,
      holder_name:           holderName.trim(),
      share_class:           shareClass.trim(),
      is_preferred:          isPreferred,
      shares:                parseInt(shares),
      price_per_share:       pps       ? parseFloat(pps)       : null,
      invested_amount:       investedAmount ? parseFloat(investedAmount) : null,
      liquidation_pref_mult: parseFloat(liqMult) || 1,
      liquidation_seniority: parseInt(seniority) || 0,
      is_participating:      isParticipating,
      participation_cap_mult: partCapMult ? parseFloat(partCapMult) : null,
      conversion_ratio:      parseFloat(conversionRatio) || 1,
      anti_dilution:         antiDilution,
    }

    const result = series
      ? await updateShareSeries(series.id, data)
      : await createShareSeries(data)

    setLoading(false)
    if (result.error) { setError(result.error); return }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Holder Name <span className="text-red-500">*</span></label>
          <input className={fi} value={holderName} onChange={e => setHolderName(e.target.value)}
            placeholder="e.g. Menomadin, Founder A" required />
        </div>
        <div>
          <label className="field-label">Share Class <span className="text-red-500">*</span></label>
          <input className={fi} value={shareClass} onChange={e => setShareClass(e.target.value)}
            placeholder="e.g. Common, Series A Preferred" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Number of Shares <span className="text-red-500">*</span></label>
          <input type="number" className={fi} value={shares} onChange={e => setShares(e.target.value)}
            placeholder="1,000,000" min="0" step="1" required />
        </div>
        <div>
          <label className="field-label">Price Per Share ($)</label>
          <input type="number" className={fi} value={pps} onChange={e => setPps(e.target.value)}
            placeholder="e.g. 1.50" min="0" step="any" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Invested Amount ($)</label>
          <input type="number" className={fi} value={investedAmount} onChange={e => setInvestedAmount(e.target.value)}
            placeholder="e.g. 500000" min="0" step="any" />
        </div>
        <div>
          <label className="field-label">Round</label>
          <select className={fi} value={roundId} onChange={e => setRoundId(e.target.value)}>
            <option value="">— None —</option>
            {rounds.map(r => (
              <option key={r.id} value={r.id}>{r.type} ({r.date.slice(0, 7)})</option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="w-4 h-4 rounded accent-gold-500"
          checked={isPreferred} onChange={e => setIsPreferred(e.target.checked)} />
        <span className="text-sm text-neutral-800 font-medium">Preferred Shares (has liquidation preference)</span>
      </label>

      {isPreferred && (
        <div className="bg-neutral-50 rounded-lg p-4 ring-1 ring-slate-200 space-y-3">
          <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Preferred Terms</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Liquidation Preference (×)</label>
              <input type="number" className={fi} value={liqMult} onChange={e => setLiqMult(e.target.value)}
                placeholder="1.0" min="0" step="0.1" />
              <p className="text-[11px] text-neutral-500 mt-1">1× = standard, 2× = double dip</p>
            </div>
            <div>
              <label className="field-label">Seniority Rank</label>
              <input type="number" className={fi} value={seniority} onChange={e => setSeniority(e.target.value)}
                placeholder="1" min="0" step="1" />
              <p className="text-[11px] text-neutral-500 mt-1">Higher = paid first. 0 = pari passu common</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Conversion Ratio</label>
              <input type="number" className={fi} value={conversionRatio} onChange={e => setConversionRatio(e.target.value)}
                placeholder="1.0" min="0" step="0.01" />
              <p className="text-[11px] text-neutral-500 mt-1">1.0 = 1:1 conversion to common</p>
            </div>
            <div>
              <label className="field-label">Anti-dilution</label>
              <select className={fi} value={antiDilution} onChange={e => setAntiDilution(e.target.value)}>
                <option value="none">None</option>
                <option value="broad_based_wa">Broad-based weighted avg</option>
                <option value="full_ratchet">Full ratchet</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-gold-500"
              checked={isParticipating} onChange={e => setIsParticipating(e.target.checked)} />
            <span className="text-sm text-neutral-800 font-medium">Participating preferred (double-dip)</span>
          </label>

          {isParticipating && (
            <div>
              <label className="field-label">Participation Cap (× invested amount)</label>
              <input type="number" className={fi} value={partCapMult} onChange={e => setPartCapMult(e.target.value)}
                placeholder="Leave blank for uncapped" min="0" step="0.1" />
              <p className="text-[11px] text-neutral-500 mt-1">e.g. 3× = stops participating after 3× return. Blank = uncapped</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Saving…' : series ? 'Save Changes' : 'Add Position'}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
      </div>
    </form>
  )
}
