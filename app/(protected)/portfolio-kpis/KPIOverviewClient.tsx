'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Minus, Filter, Upload,
  AreaChart as AreaChartIcon, Table,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { CompanyKPI } from '@/lib/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number | null) {
  if (n == null) return null
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
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

// ── Inline Sparkline (SVG) ────────────────────────────────────────────────────

function Sparkline({ values, color = '#7c3aed' }: { values: number[]; color?: string }) {
  if (values.length < 2) return <span className="text-slate-200 text-xs">·</span>

  const w = 52, h = 20, pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })

  const isUp   = values[values.length - 1] >= values[0]
  const stroke = isUp ? '#10b981' : '#ef4444'

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last dot */}
      <circle
        cx={pts[pts.length - 1].split(',')[0]}
        cy={pts[pts.length - 1].split(',')[1]}
        r={2}
        fill={stroke}
      />
    </svg>
  )
}

// ── Trend indicator ───────────────────────────────────────────────────────────

function TrendBadge({ current, prev }: { current: number | null; prev: number | null }) {
  if (current == null || prev == null || prev === 0) return null
  const pct = ((current - prev) / prev) * 100
  const up  = pct > 0
  const flat = Math.abs(pct) < 1
  return (
    <span className={`text-[10px] font-semibold ml-1 ${flat ? 'text-slate-400' : up ? 'text-emerald-600' : 'text-red-500'}`}>
      {flat ? '' : up ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`}
    </span>
  )
}

// ── CSV Import ────────────────────────────────────────────────────────────────

function CsvImportButton({ companies }: { companies: { id: string; name: string }[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setResult(null)

    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const header = lines[0].toLowerCase().split(',').map(h => h.trim())

    const col = (name: string) => header.indexOf(name)
    const colCompany    = col('company')
    const colDate       = col('date')
    const colArr        = col('arr')
    const colRevenue    = col('revenue')
    const colBurn       = col('burn_rate')
    const colRunway     = col('cash_runway')
    const colHeadcount  = col('headcount')
    const colGrossMargin = col('gross_margin')

    if (colCompany === -1 || colDate === -1) {
      setResult('CSV must have "company" and "date" columns.')
      setImporting(false)
      return
    }

    const rows = lines.slice(1)
    let inserted = 0, skipped = 0

    const nameToId = Object.fromEntries(companies.map(c => [c.name.toLowerCase().trim(), c.id]))

    for (const row of rows) {
      const cells = row.split(',').map(c => c.trim())
      const companyName = cells[colCompany]?.toLowerCase()
      const companyId   = nameToId[companyName]
      if (!companyId) { skipped++; continue }
      const num = (i: number) => i !== -1 && cells[i] ? Number(cells[i]) : null

      const payload = {
        company_id:   companyId,
        date:         cells[colDate],
        arr:          num(colArr),
        revenue:      num(colRevenue),
        burn_rate:    num(colBurn),
        cash_runway:  num(colRunway),
        headcount:    num(colHeadcount),
        gross_margin: num(colGrossMargin),
      }

      const res = await fetch('/api/kpi-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) inserted++
      else skipped++
    }

    setResult(`Imported ${inserted} row(s)${skipped > 0 ? `, skipped ${skipped}` : ''}.`)
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
    if (inserted > 0) router.refresh()
  }

  return (
    <div className="relative">
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300 transition-all disabled:opacity-50"
      >
        <Upload size={12} />
        {importing ? 'Importing…' : 'Import CSV'}
      </button>
      {result && (
        <p className="absolute right-0 top-full mt-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow whitespace-nowrap z-10">
          {result}
        </p>
      )}
    </div>
  )
}

// ── Portfolio ARR stacked area chart ─────────────────────────────────────────

const CHART_COLORS = [
  '#7c3aed', '#2563eb', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#8b5cf6', '#f97316',
]

function PortfolioArrChart({
  companies,
  kpisByCompany,
}: {
  companies: { id: string; name: string }[]
  kpisByCompany: Record<string, CompanyKPI[]>
}) {
  // Build a combined timeline keyed by date
  const dateSet = new Set<string>()
  for (const kpis of Object.values(kpisByCompany)) {
    for (const k of kpis) {
      if (k.arr != null) dateSet.add(k.date.slice(0, 7)) // YYYY-MM
    }
  }
  const dates = [...dateSet].sort()
  if (dates.length < 2) return (
    <div className="flex items-center justify-center h-40 text-sm text-slate-400">
      Not enough ARR data to display chart. Add KPIs with ARR values to companies.
    </div>
  )

  // For each date, get ARR per company (forward-fill last known)
  const companiesWithArr = companies.filter(c =>
    (kpisByCompany[c.id] ?? []).some(k => k.arr != null)
  )

  const data = dates.map(month => {
    const point: Record<string, number | string> = { month }
    for (const co of companiesWithArr) {
      const kpis = kpisByCompany[co.id] ?? []
      // Latest KPI at or before this month
      const matching = kpis
        .filter(k => k.arr != null && k.date.slice(0, 7) <= month)
        .sort((a, b) => b.date.localeCompare(a.date))
      point[co.name] = matching[0]?.arr ?? 0
    }
    return point
  })

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={v => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K` : `$${v}`}
        />
        <Tooltip
          formatter={(v, name) => [typeof v === 'number' ? (fmt$(v) ?? '—') : '—', name as string]}
          labelStyle={{ fontWeight: 600, fontSize: 12 }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {companiesWithArr.map((co, i) => (
          <Area
            key={co.id}
            type="monotone"
            dataKey={co.name}
            stackId="1"
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Company {
  id: string
  name: string
  sector: string
  strategy: string
  status: string
  logo_url: string | null
}

interface Props {
  companies: Company[]
  kpisByCompany: Record<string, CompanyKPI[]>
  latestKPIs: Record<string, CompanyKPI>
}

export default function KPIOverviewClient({ companies, kpisByCompany, latestKPIs }: Props) {
  const [strategy, setStrategy]     = useState<'all' | 'impact' | 'venture'>('all')
  const [onlyWithData, setOnlyWithData] = useState(false)
  const [view, setView]             = useState<'table' | 'chart'>('table')

  const filtered = companies.filter(c => {
    if (strategy !== 'all' && c.strategy !== strategy) return false
    if (onlyWithData && !latestKPIs[c.id]) return false
    return true
  })

  const withData = filtered.filter(c => latestKPIs[c.id]).length

  // Portfolio-wide ARR (latest per company summed)
  const totalArr = Object.values(latestKPIs).reduce((s, k) => s + (k.arr ?? 0), 0)

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="page-header border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="page-title">Portfolio KPIs</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {withData} of {filtered.length} companies with data
            {totalArr > 0 && ` · ${fmt$(totalArr)} total ARR`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Strategy toggle */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {(['all', 'impact', 'venture'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  strategy === s ? 'bg-gold-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {s === 'all' ? 'All' : s === 'impact' ? 'Impact' : 'Ventures'}
              </button>
            ))}
          </div>

          {/* Table / Chart toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setView('table')}
              className={`p-2 transition-colors ${view === 'table' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'}`}
              title="Table view"
            >
              <Table size={14} />
            </button>
            <button
              onClick={() => setView('chart')}
              className={`p-2 transition-colors ${view === 'chart' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'}`}
              title="ARR Chart"
            >
              <AreaChartIcon size={14} />
            </button>
          </div>

          <button
            onClick={() => setOnlyWithData(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              onlyWithData ? 'bg-gold-500 text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
            }`}
          >
            <Filter size={12} /> With data
          </button>

          <CsvImportButton companies={companies} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">

      {view === 'chart' ? (
        /* ── Chart view ─────────────────────────────────────────────────── */
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Portfolio ARR Over Time</h2>
          <p className="text-xs text-slate-400 mb-5">Stacked area — each layer = one company's ARR</p>
          <PortfolioArrChart companies={companies} kpisByCompany={kpisByCompany} />
        </div>
      ) : (
        /* ── Table view ─────────────────────────────────────────────────── */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 dark:bg-slate-900/50">Company</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">ARR</th>
                  <th className="px-2 py-3 w-14" />
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Burn /mo</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Runway</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Headcount</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Gross Margin</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(co => {
                  const kpi    = latestKPIs[co.id]
                  const allKpis = kpisByCompany[co.id] ?? []
                  const prevKpi = allKpis.length >= 2 ? allKpis[allKpis.length - 2] : null
                  const statusCfg = STATUS_LABELS[co.status]

                  // Sparkline values: last 4 ARR (or revenue) snapshots
                  const sparkVals = allKpis
                    .slice(-4)
                    .map(k => k.arr ?? k.revenue ?? k.run_rate)
                    .filter((v): v is number => v != null)

                  return (
                    <tr key={co.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                      <td className="px-5 py-3.5 sticky left-0 bg-white">
                        <div className="flex items-center gap-3">
                          {co.logo_url ? (
                            <img src={co.logo_url} alt={co.name} className="w-7 h-7 rounded-lg object-contain bg-slate-50 ring-1 ring-slate-100 flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-gold-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-gold-500">{co.name[0]}</span>
                            </div>
                          )}
                          <div>
                            <Link href={`/companies/${co.id}`} className="font-semibold text-slate-900 hover:text-gold-500 transition-colors">
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
                          <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                            {fmt$(kpi.arr) ?? <span className="text-slate-300">—</span>}
                            <TrendBadge current={kpi.arr} prev={prevKpi?.arr ?? null} />
                          </td>
                          <td className="px-2 py-3.5">
                            {sparkVals.length >= 2 && <Sparkline values={sparkVals} />}
                          </td>
                          <td className="px-4 py-3.5 text-right text-slate-600">{fmt$(kpi.revenue) ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3.5 text-right text-slate-600">{fmt$(kpi.burn_rate) ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3.5 text-right"><RunwayBadge months={kpi.cash_runway} /></td>
                          <td className="px-4 py-3.5 text-right text-slate-600">{kpi.headcount ?? <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3.5 text-right text-slate-600">
                            {kpi.gross_margin != null ? `${kpi.gross_margin.toFixed(1)}%` : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-right text-xs text-slate-400">
                            {new Date(kpi.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </td>
                        </>
                      ) : (
                        <td colSpan={8} className="px-4 py-3.5 text-center text-xs text-slate-300">
                          No KPI data —{' '}
                          <Link href={`/companies/${co.id}`} className="text-gold-300 hover:text-gold-500 hover:underline">
                            add from company page
                          </Link>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>

              {/* Portfolio total row */}
              {withData > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase sticky left-0 bg-slate-50">
                      Portfolio Total
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {fmt$(Object.values(latestKPIs).reduce((s, k) => s + (k.arr ?? 0), 0)) ?? '—'}
                    </td>
                    <td />
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {fmt$(Object.values(latestKPIs).reduce((s, k) => s + (k.revenue ?? 0), 0)) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {fmt$(Object.values(latestKPIs).reduce((s, k) => s + (k.burn_rate ?? 0), 0)) ?? '—'}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* CSV format hint */}
      <p className="text-xs text-slate-400 mt-3">
        CSV import format: <code className="bg-slate-100 px-1 rounded text-slate-600">company, date, arr, revenue, burn_rate, cash_runway, headcount, gross_margin</code>
      </p>
      </div>
    </div>
  )
}
