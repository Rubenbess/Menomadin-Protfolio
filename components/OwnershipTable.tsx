'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Info, Shield } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import ShareSeriesForm from '@/components/forms/ShareSeriesForm'
import OptionPoolForm from '@/components/forms/OptionPoolForm'
import { deleteShareSeries } from '@/actions/share-series'
import { deleteOptionPool } from '@/actions/option-pools'
import {
  calcFullyDilutedShares,
  calcIssuedOwnershipPct,
  calcFullyDilutedOwnershipPct,
  assessDataCompleteness,
  fmt$$,
  fmtPct,
} from '@/lib/calculations'
import type { ShareSeries, OptionPool, Round, DataCompleteness } from '@/lib/types'

interface Props {
  companyId: string
  shareSeries: ShareSeries[]
  optionPools: OptionPool[]
  rounds: Round[]
}

const COMPLETENESS_CONFIG: Record<DataCompleteness, { label: string; color: string; desc: string }> = {
  minimal:         { label: 'Minimal',         color: 'bg-slate-100 text-slate-600',   desc: 'No share data — using cap table % only' },
  partial:         { label: 'Partial',          color: 'bg-amber-100 text-amber-700',   desc: 'Share data present but missing PPS or amounts' },
  high_confidence: { label: 'High Confidence',  color: 'bg-blue-100 text-blue-700',     desc: 'Full share data with PPS and liquidation stack' },
  fully_modeled:   { label: 'Fully Modeled',    color: 'bg-emerald-100 text-emerald-700', desc: 'Complete: shares, PPS, liq prefs, option pools' },
}

function fmtShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export default function OwnershipTable({ companyId, shareSeries, optionPools, rounds }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'issued' | 'fd'>('issued')
  const [showAddSeries, setShowAddSeries]     = useState(false)
  const [editingSeries, setEditingSeries]     = useState<ShareSeries | null>(null)
  const [showAddPool, setShowAddPool]         = useState(false)
  const [editingPool, setEditingPool]         = useState<OptionPool | null>(null)

  const completeness = assessDataCompleteness(shareSeries, optionPools)
  const cc = COMPLETENESS_CONFIG[completeness]

  const totalIssuedShares = shareSeries.reduce((s, h) => s + h.shares, 0)
  const totalFDShares     = calcFullyDilutedShares(totalIssuedShares, optionPools)
  const unissuedOptions   = optionPools.reduce((s, p) => s + (p.shares_authorized - p.shares_issued), 0)

  // Group by share class for display
  const classMap = new Map<string, { shares: number; holders: ShareSeries[] }>()
  for (const s of shareSeries) {
    const existing = classMap.get(s.share_class) ?? { shares: 0, holders: [] }
    classMap.set(s.share_class, { shares: existing.shares + s.shares, holders: [...existing.holders, s] })
  }

  async function handleDeleteSeries(id: string) {
    if (!confirm('Delete this position?')) return
    await deleteShareSeries(id)
    router.refresh()
  }

  async function handleDeletePool(id: string) {
    if (!confirm('Delete this option pool?')) return
    await deleteOptionPool(id)
    router.refresh()
  }

  const th = 'px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left'
  const td = 'px-4 py-3'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Ownership Structure</h3>
          <p className="text-xs text-slate-400 mt-0.5">Issued shares · fully diluted · liquidation stack</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cc.color}`} title={cc.desc}>
            {cc.label}
          </span>
          <Button size="sm" variant="secondary" onClick={() => { setEditingPool(null); setShowAddPool(true) }}>
            <Plus size={12} /> Option Pool
          </Button>
          <Button size="sm" onClick={() => { setEditingSeries(null); setShowAddSeries(true) }}>
            <Plus size={13} /> Add Position
          </Button>
        </div>
      </div>

      {shareSeries.length === 0 ? (
        <div className="p-6 text-center">
          <Shield size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-1">No share data recorded</p>
          <p className="text-xs text-slate-400 mb-4">
            Add shareholder positions with share counts to unlock institutional ownership analysis,
            fully-diluted calculations, and exit waterfall modeling.
          </p>
          <Button size="sm" onClick={() => setShowAddSeries(true)}>
            <Plus size={13} /> Add First Position
          </Button>
        </div>
      ) : (
        <>
          {/* View toggle */}
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {(['issued', 'fd'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    view === v
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {v === 'issued' ? 'Issued Shares' : 'Fully Diluted'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-2">
              <Info size={11} />
              {view === 'issued'
                ? `${fmtShares(totalIssuedShares)} issued shares`
                : `${fmtShares(totalFDShares)} FD shares (incl. ${fmtShares(unissuedOptions)} unissued options)`
              }
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70">
                  <th className={th}>Holder</th>
                  <th className={th}>Share Class</th>
                  <th className={th}>Shares</th>
                  <th className={th}>PPS</th>
                  <th className={th}>Invested</th>
                  <th className={th}>Ownership %</th>
                  <th className={th}>Liq. Pref</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {shareSeries.map(s => {
                  const totalShares = view === 'issued' ? totalIssuedShares : totalFDShares
                  const pct = view === 'issued'
                    ? calcIssuedOwnershipPct(s.shares, totalIssuedShares)
                    : calcFullyDilutedOwnershipPct(s.shares, totalFDShares)
                  const barWidth = Math.min(100, pct)

                  return (
                    <tr key={s.id} className="group hover:bg-primary-50/30 transition-colors">
                      <td className={td + ' font-medium text-slate-900'}>{s.holder_name}</td>
                      <td className={td}>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          s.is_preferred
                            ? 'bg-primary-100 text-primary-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {s.share_class}
                        </span>
                      </td>
                      <td className={td + ' font-mono text-slate-700'}>{fmtShares(s.shares)}</td>
                      <td className={td + ' text-slate-600'}>
                        {s.price_per_share ? `$${s.price_per_share.toFixed(4)}` : '—'}
                      </td>
                      <td className={td + ' text-slate-600'}>
                        {s.invested_amount ? fmt$$(s.invested_amount) : '—'}
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.is_preferred ? 'bg-primary-500' : 'bg-blue-400'}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 tabular-nums">
                            {fmtPct(pct)}
                          </span>
                        </div>
                      </td>
                      <td className={td + ' text-slate-600 text-xs'}>
                        {s.is_preferred ? (
                          <span>
                            {s.liquidation_pref_mult}×
                            {s.is_participating ? (
                              <span className="ml-1 text-amber-600">
                                Participating{s.participation_cap_mult ? ` (${s.participation_cap_mult}× cap)` : ' (uncapped)'}
                              </span>
                            ) : (
                              <span className="ml-1 text-slate-400">Non-participating</span>
                            )}
                          </span>
                        ) : '—'}
                      </td>
                      <td className={td + ' text-right'}>
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => { setEditingSeries(s); setShowAddSeries(true) }}
                            className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                          ><Pencil size={12} /></button>
                          <button
                            onClick={() => handleDeleteSeries(s.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          ><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* Option pool rows */}
                {view === 'fd' && optionPools.map(pool => {
                  const unissued = pool.shares_authorized - pool.shares_issued
                  const pct = calcFullyDilutedOwnershipPct(pool.shares_authorized, totalFDShares)
                  return (
                    <tr key={pool.id} className="group hover:bg-emerald-50/20 transition-colors opacity-70">
                      <td className={td + ' text-slate-500 italic'}>{pool.name} (pool)</td>
                      <td className={td}>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          Option Pool
                        </span>
                      </td>
                      <td className={td + ' font-mono text-slate-500'}>
                        {fmtShares(pool.shares_authorized)}
                        <span className="text-xs text-slate-400 ml-1">
                          ({fmtShares(pool.shares_issued)} issued, {fmtShares(unissued)} reserved)
                        </span>
                      </td>
                      <td className={td + ' text-slate-500'}>
                        {pool.price_per_share ? `$${pool.price_per_share.toFixed(4)}` : '—'}
                      </td>
                      <td className={td + ' text-slate-400 text-xs italic'}>Pool</td>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-500 tabular-nums">{fmtPct(pct)}</span>
                        </div>
                      </td>
                      <td className={td + ' text-slate-400 text-xs'}>—</td>
                      <td className={td + ' text-right'}>
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => { setEditingPool(pool); setShowAddPool(true) }}
                            className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all"
                          ><Pencil size={12} /></button>
                          <button
                            onClick={() => handleDeletePool(pool.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          ><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/70">
                  <td className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900 font-mono">
                    {fmtShares(view === 'issued' ? totalIssuedShares : totalFDShares)}
                  </td>
                  <td colSpan={2} />
                  <td className="px-4 py-3 text-xs font-bold text-slate-700">100%</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Anti-dilution note */}
          {shareSeries.some(s => s.anti_dilution !== 'none') && (
            <div className="mx-5 mb-4 mt-3 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <Info size={11} />
              {shareSeries.filter(s => s.anti_dilution === 'broad_based_wa').length} position(s) have broad-based weighted-average anti-dilution protection.
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <Modal
        open={showAddSeries}
        onClose={() => { setShowAddSeries(false); setEditingSeries(null) }}
        title={editingSeries ? 'Edit Position' : 'Add Shareholder Position'}
      >
        <ShareSeriesForm
          companyId={companyId}
          rounds={rounds}
          series={editingSeries}
          onClose={() => { setShowAddSeries(false); setEditingSeries(null) }}
        />
      </Modal>

      <Modal
        open={showAddPool}
        onClose={() => { setShowAddPool(false); setEditingPool(null) }}
        title={editingPool ? 'Edit Option Pool' : 'Add Option Pool'}
      >
        <OptionPoolForm
          companyId={companyId}
          pool={editingPool}
          onClose={() => { setShowAddPool(false); setEditingPool(null) }}
        />
      </Modal>
    </div>
  )
}
