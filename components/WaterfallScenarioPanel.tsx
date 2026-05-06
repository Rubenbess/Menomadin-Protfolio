'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Zap, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { createWaterfallScenario, deleteWaterfallScenario } from '@/actions/waterfall-scenarios'
import {
  buildWaterfallHolders,
  calcWaterfall,
  calcFullyDilutedShares,
  fmt$$,
  fmtMultiple,
  fmtPct,
} from '@/lib/calculations'
import type { ShareSeries, OptionPool, Safe, WaterfallScenario } from '@/lib/types'

interface Props {
  companyId: string
  shareSeries: ShareSeries[]
  optionPools: OptionPool[]
  safes: Safe[]
  savedScenarios: WaterfallScenario[]
}

const PRESETS = [
  { label: '$5M',   value: 5_000_000 },
  { label: '$25M',  value: 25_000_000 },
  { label: '$50M',  value: 50_000_000 },
  { label: '$100M', value: 100_000_000 },
  { label: '$250M', value: 250_000_000 },
]

function ColorBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

const BAR_COLORS = [
  'bg-primary-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
]

export default function WaterfallScenarioPanel({
  companyId, shareSeries, optionPools, safes, savedScenarios,
}: Props) {
  const router = useRouter()
  const [exitValue, setExitValue]     = useState('')
  const [customExit, setCustomExit]   = useState('')
  const [saveName, setSaveName]       = useState('')
  const [saving, setSaving]           = useState(false)
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null)

  const hasShareData = shareSeries.length > 0
  const { holders, warnings: holderWarnings } = useMemo(
    () => buildWaterfallHolders(shareSeries, safes),
    [shareSeries, safes],
  )

  const activeExitValue = parseFloat(exitValue) || parseFloat(customExit) || 0
  const result = useMemo(
    () => (activeExitValue > 0 && holders.length > 0 ? calcWaterfall(activeExitValue, holders) : null),
    [activeExitValue, holders],
  )

  const { totalIssuedShares, totalFDShares } = useMemo(() => {
    const tis = shareSeries.reduce((s, h) => s + h.shares, 0)
    return { totalIssuedShares: tis, totalFDShares: calcFullyDilutedShares(tis, optionPools) }
  }, [shareSeries, optionPools])

  async function handleSave() {
    if (!activeExitValue || !saveName.trim()) return
    setSaving(true)
    await createWaterfallScenario({
      company_id: companyId,
      name: saveName.trim(),
      exit_value: activeExitValue,
    })
    setSaving(false)
    setSaveName('')
    router.refresh()
  }

  async function handleDeleteScenario(id: string) {
    if (!confirm('Delete this scenario?')) return
    await deleteWaterfallScenario(id)
    router.refresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Exit Waterfall</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Liquidation preferences · conversion analysis · proceeds distribution</p>
        </div>
      </div>

      {!hasShareData ? (
        <div className="p-6 text-center">
          <TrendingUp size={28} className="text-slate-300 dark:text-neutral-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">No share data available</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Add shareholder positions in the Ownership tab to enable waterfall modeling.
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Exit value selector */}
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-3 flex items-center gap-2">
              <Zap size={14} className="text-primary-500" /> Model Exit Scenario
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setExitValue(p.value.toString()); setCustomExit('') }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    exitValue === p.value.toString()
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:border-gold-300 dark:hover:border-gold-700 hover:text-primary-500 dark:hover:text-primary-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 text-sm">$</span>
                <input
                  type="number"
                  className="w-full pl-7 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500"
                  placeholder="Custom exit value"
                  value={customExit}
                  onChange={e => { setCustomExit(e.target.value); setExitValue('') }}
                  min="0"
                  step="any"
                />
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">or enter custom above</span>
            </div>
          </div>

          {/* Excluded SAFE warnings — surface data quality so users see why some SAFEs aren't in the waterfall */}
          {holderWarnings.length > 0 && (
            <div className="rounded-lg ring-1 ring-amber-200 dark:ring-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  {holderWarnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="bg-gold-50 dark:bg-gold-900/20 rounded-lg p-4 ring-1 ring-gold-100 dark:ring-gold-800/60">
                <p className="text-xs font-semibold text-primary-500 dark:text-primary-300 uppercase tracking-wider mb-3">
                  Exit at {fmt$$(result.totalProceeds)} — Distribution
                </p>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
                  {result.holders.filter(h => h.proceeds > 0).map((h, i) => (
                    <div
                      key={h.id}
                      className={BAR_COLORS[i % BAR_COLORS.length]}
                      style={{ width: `${(h.proceeds / result.totalProceeds) * 100}%` }}
                      title={`${h.name}: ${fmt$$(h.proceeds)}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {result.holders.filter(h => h.proceeds > 0).map((h, i) => (
                    <span key={h.id} className="flex items-center gap-1 text-xs text-neutral-700 dark:text-neutral-300">
                      <span className={`w-2 h-2 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                      {h.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200 dark:ring-neutral-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                      {['Holder', 'Class', 'Shares', '% Issued', 'Proceeds', 'MOIC', 'Note'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                    {result.holders.sort((a, b) => b.proceeds - a.proceeds).map((h, i) => (
                      <tr key={h.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-50">{h.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            h.isPreferred
                              ? 'bg-gold-100 dark:bg-gold-900/30 text-primary-600 dark:text-primary-300'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}>
                            {h.shareClass}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-700 dark:text-neutral-300 text-xs">
                          {h.shares > 0 ? h.shares.toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 text-xs">
                          {h.ownershipPct > 0 ? fmtPct(h.ownershipPct) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ColorBar
                              pct={(h.proceeds / result.totalProceeds) * 100}
                              color={BAR_COLORS[i % BAR_COLORS.length]}
                            />
                            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 tabular-nums min-w-[64px]">
                              {fmt$$(h.proceeds)}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {fmtPct((h.proceeds / result.totalProceeds) * 100)} of exit
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {h.multiple != null ? (
                            <span className={`text-sm font-bold ${
                              h.multiple >= 3 ? 'text-emerald-600 dark:text-emerald-400' :
                              h.multiple >= 1 ? 'text-slate-800 dark:text-neutral-200' :
                              'text-red-500 dark:text-red-400'
                            }`}>
                              {fmtMultiple(h.multiple)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                          {h.isConverting && (
                            <span className="text-blue-600 dark:text-blue-300 font-medium">Converts ↗</span>
                          )}
                          {!h.isConverting && h.isPreferred && h.proceeds > 0 && (
                            <span className="text-primary-500 dark:text-primary-300">Takes pref.</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                      <td className="px-4 py-2.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase" colSpan={4}>Total</td>
                      <td className="px-4 py-2.5 font-bold text-neutral-900 dark:text-neutral-50">{fmt$$(result.totalProceeds)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Save scenario */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500"
                  placeholder="Name this scenario to save…"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                />
                <Button size="sm" onClick={handleSave} disabled={!saveName.trim() || saving}>
                  {saving ? 'Saving…' : 'Save Scenario'}
                </Button>
              </div>
            </div>
          )}

          {/* Saved scenarios */}
          {savedScenarios.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-2">Saved Scenarios</p>
              <div className="space-y-2">
                {savedScenarios.map(s => {
                  const savedResult = holders.length > 0 ? calcWaterfall(s.exit_value, holders) : null
                  const isExpanded = expandedScenario === s.id

                  return (
                    <div key={s.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                        onClick={() => setExpandedScenario(isExpanded ? null : s.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{s.name}</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">Exit at {fmt$$(s.exit_value)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteScenario(s.id) }}
                            className="p-1 text-slate-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                          ><Trash2 size={12} /></button>
                          {isExpanded ? <ChevronUp size={14} className="text-neutral-500 dark:text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-500 dark:text-neutral-400" />}
                        </div>
                      </button>

                      {isExpanded && savedResult && (
                        <div className="border-t border-neutral-200 dark:border-neutral-700 overflow-x-auto">
                          <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-50 dark:divide-neutral-800">
                              {savedResult.holders.sort((a, b) => b.proceeds - a.proceeds).map(h => (
                                <tr key={h.id} className="px-4">
                                  <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200 text-xs">{h.name}</td>
                                  <td className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400">{h.shareClass}</td>
                                  <td className="px-4 py-2 font-semibold text-neutral-900 dark:text-neutral-50 text-xs">{fmt$$(h.proceeds)}</td>
                                  <td className="px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                                    {fmtPct((h.proceeds / savedResult.totalProceeds) * 100)}
                                  </td>
                                  <td className="px-4 py-2 text-xs">
                                    {h.multiple != null && (
                                      <span className={h.multiple >= 1 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400 font-medium'}>
                                        {fmtMultiple(h.multiple)}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
