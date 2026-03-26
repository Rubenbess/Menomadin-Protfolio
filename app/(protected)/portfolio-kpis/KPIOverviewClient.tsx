'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react'

interface Company {
  id: string
  name: string
  sector: string
  strategy: string
  status: string
  logo_url: string | null
}

interface KPI {
  company_id: string
  date: string
  revenue: number | null
  arr: number | null
  run_rate: number | null
  burn_rate: number | null
  cash_runway: number | null
  headcount: number | null
  gross_margin: number | null
}

interface Props {
  companies: Company[]
  latestKPIs: Record<string, KPI>
}

function fmt$(n: number | null) {
  if (n == null) return <span className="text-slate-300">—</span>
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function fmtMonths(n: number | null) {
  if (n == null) return <span className="text-slate-300">—</span>
  return `${n.toFixed(1)}mo`
}

function fmtPct(n: number | null) {
  if (n == null) return <span className="text-slate-300">—</span>
  return `${n.toFixed(1)}%`
}

function RunwayBadge({ months }: { months: number | null }) {
  if (months == null) return <span className="text-slate-300">—</span>
  if (months < 6) return (
    <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs">
      <TrendingDown size={11} /> {months.toFixed(1)}mo
    </span>
  )
  if (months < 12) return (
    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-xs">
      <Minus size={11} /> {months.toFixed(1)}mo
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
      <TrendingUp size={11} /> {months.toFixed(1)}mo
    </span>
  )
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:        { label: 'Active',      cls: 'bg-emerald-100 text-emerald-700' },
  exited:        { label: 'Exited',      cls: 'bg-indigo-100 text-indigo-700' },
  watchlist:     { label: 'Watchlist',   cls: 'bg-amber-100 text-amber-700' },
  'written-off': { label: 'Written off', cls: 'bg-red-100 text-red-600' },
}

export default function KPIOverviewClient({ companies, latestKPIs }: Props) {
  const [strategy, setStrategy] = useState<'all' | 'impact' | 'venture'>('all')
  const [onlyWithData, setOnlyWithData] = useState(false)

  const filtered = companies.filter(c => {
    if (strategy !== 'all' && c.strategy !== strategy) return false
    if (onlyWithData && !latestKPIs[c.id]) return false
    return true
  })

  const withData = filtered.filter(c => latestKPIs[c.id]).length

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Portfolio KPIs</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Latest metrics across all portfolio companies · {withData} of {filtered.length} have data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {(['all', 'impact', 'venture'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  strategy === s ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {s === 'all' ? 'All' : s === 'impact' ? 'Impact' : 'Ventures'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOnlyWithData(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              onlyWithData
                ? 'bg-violet-600 text-white border-transparent'
                : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
            }`}
          >
            <Filter size={12} /> With data only
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50/70">Company</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">ARR</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Burn / mo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Runway</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Headcount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Margin</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(co => {
                const kpi = latestKPIs[co.id]
                const statusCfg = STATUS_LABELS[co.status]
                return (
                  <tr key={co.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 sticky left-0 bg-white">
                      <div className="flex items-center gap-3">
                        {co.logo_url ? (
                          <img src={co.logo_url} alt={co.name} className="w-7 h-7 rounded-lg object-contain bg-slate-50 ring-1 ring-slate-100 flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-violet-600">{co.name[0]}</span>
                          </div>
                        )}
                        <div>
                          <Link href={`/companies/${co.id}`} className="font-semibold text-slate-900 hover:text-violet-600 transition-colors">
                            {co.name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {co.sector && <p className="text-xs text-slate-400">{co.sector}</p>}
                            {statusCfg && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusCfg.cls}`}>
                                {statusCfg.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {kpi ? (
                      <>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-700">{fmt$(kpi.arr)}</td>
                        <td className="px-4 py-3.5 text-right text-slate-600">{fmt$(kpi.revenue)}</td>
                        <td className="px-4 py-3.5 text-right text-slate-600">{fmt$(kpi.burn_rate)}</td>
                        <td className="px-4 py-3.5 text-right"><RunwayBadge months={kpi.cash_runway} /></td>
                        <td className="px-4 py-3.5 text-right text-slate-600">{kpi.headcount ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3.5 text-right text-slate-600">{fmtPct(kpi.gross_margin)}</td>
                        <td className="px-5 py-3.5 text-right text-xs text-slate-400">
                          {new Date(kpi.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </td>
                      </>
                    ) : (
                      <td colSpan={7} className="px-4 py-3.5 text-center text-xs text-slate-300">
                        No KPI data yet —{' '}
                        <Link href={`/companies/${co.id}`} className="text-violet-400 hover:text-violet-600 hover:underline">
                          add from company page
                        </Link>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
