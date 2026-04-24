'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, PieChart, Pie,
} from 'recharts'
import { normalizeSector } from '@/lib/calculations'

interface CompanyData {
  name: string
  totalInvested: number
  currentValue: number
  moic: number
  sector: string
  status: string
}

interface InvestmentData {
  date: string
  amount: number
}

interface Props {
  companies: CompanyData[]
  investments?: InvestmentData[]
}

// ── Palette ───────────────────────────────────────────────────────────────────

const SECTOR_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string }> = {
  active:        { label: 'Active',       color: '#10b981', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  exited:        { label: 'Exited',       color: '#6366f1', bg: 'bg-indigo-50',   text: 'text-indigo-700'  },
  watchlist:     { label: 'Watchlist',    color: '#f59e0b', bg: 'bg-amber-50',    text: 'text-amber-700'   },
  'written-off': { label: 'Written off',  color: '#ef4444', bg: 'bg-red-50',      text: 'text-red-600'     },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #f1f5f9',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  fontSize: 12,
  padding: '8px 12px',
}

// ── Invested vs Value ─────────────────────────────────────────────────────────

function PerformanceChart({ companies }: Props) {
  const data = companies
    .filter(c => c.totalInvested > 0)
    .sort((a, b) => b.totalInvested - a.totalInvested)
    .slice(0, 12)
    .map(c => ({
      name: c.name.length > 14 ? c.name.slice(0, 13) + '…' : c.name,
      Invested: c.totalInvested,
      Value: c.currentValue,
    }))

  if (data.length === 0) return null

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Invested vs Current Value</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Per company · sorted by capital deployed</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
            Invested
          </span>
          <span className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            Current Value
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="35%" barGap={3} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            formatter={(v, name) => [fmt(Number(v)), name]}
            contentStyle={tooltipStyle}
            cursor={{ fill: '#f8fafc', radius: 4 }}
          />
          <Bar dataKey="Invested" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Value"    fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Sector Allocation ─────────────────────────────────────────────────────────

function SectorChart({ companies }: Props) {
  const sectorMap: Record<string, number> = {}
  for (const c of companies) {
    const s = normalizeSector(c.sector || 'Other')
    sectorMap[s] = (sectorMap[s] ?? 0) + c.totalInvested
  }

  const total = Object.values(sectorMap).reduce((s, v) => s + v, 0)
  const data = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) return null

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-0.5">Sector Allocation</h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">By capital invested</p>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="flex-shrink-0">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={66}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [fmt(Number(v)), 'Invested']}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom legend */}
        <div className="flex-1 space-y-2 min-w-0">
          {data.slice(0, 6).map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
              />
              <span className="text-xs text-neutral-700 truncate flex-1">{entry.name}</span>
              <span className="text-xs font-semibold text-neutral-800 flex-shrink-0">
                {total > 0 ? fmtPct((entry.value / total) * 100) : '—'}
              </span>
            </div>
          ))}
          {data.length > 6 && (
            <p className="text-xs text-neutral-500">+{data.length - 6} more</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── MOIC Ranking ──────────────────────────────────────────────────────────────

function MoicChart({ companies }: Props) {
  const data = companies
    .filter(c => c.moic > 0)
    .sort((a, b) => b.moic - a.moic)
    .slice(0, 10)
    .map(c => ({
      name: c.name.length > 18 ? c.name.slice(0, 17) + '…' : c.name,
      moic: parseFloat(c.moic.toFixed(2)),
    }))

  if (data.length === 0) return null

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-0.5">MOIC by Company</h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">Top performers ranked by return multiple</p>
      <ResponsiveContainer width="100%" height={data.length * 32 + 20}>
        <BarChart data={data} layout="vertical" barCategoryGap="30%" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tickFormatter={v => `${v}x`}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            formatter={(v) => [`${Number(v).toFixed(2)}x`, 'MOIC']}
            contentStyle={tooltipStyle}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="moic" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#94a3b8', formatter: (v: unknown) => `${v}x` }}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.moic >= 2 ? '#10b981' : entry.moic >= 1 ? '#6366f1' : '#f59e0b'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-50">
        {[
          { label: '≥ 2x', color: '#10b981' },
          { label: '1–2x', color: '#6366f1' },
          { label: '< 1x', color: '#f59e0b' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Portfolio Status ──────────────────────────────────────────────────────────

function StatusBreakdown({ companies }: Props) {
  const counts: Record<string, number> = {}
  for (const c of companies) {
    counts[c.status] = (counts[c.status] ?? 0) + 1
  }

  const total = companies.length
  if (total === 0) return null

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-0.5">Portfolio Status</h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">Company health breakdown · {total} total</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = counts[key] ?? 0
          const pct = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={key} className={`rounded-lg px-4 py-3 ${cfg.bg}`}>
              <p className={`text-2xl font-bold ${cfg.text}`}>{count}</p>
              <p className={`text-xs font-medium mt-0.5 ${cfg.text} opacity-80`}>{cfg.label}</p>
              <p className={`text-xs mt-1 ${cfg.text} opacity-60`}>{fmtPct(pct)} of portfolio</p>
            </div>
          )
        })}
      </div>

      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const pct = total > 0 ? ((counts[key] ?? 0) / total) * 100 : 0
          if (pct === 0) return null
          return (
            <div
              key={key}
              className="h-full transition-all"
              style={{ width: `${pct}%`, background: cfg.color }}
              title={`${cfg.label}: ${counts[key] ?? 0}`}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DashboardCharts({ companies }: Props) {
  if (companies.length === 0) return null

  return (
    <div className="space-y-4 mb-8">
      <PerformanceChart companies={companies} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MoicChart companies={companies} />
        </div>
        <SectorChart companies={companies} />
      </div>

      <StatusBreakdown companies={companies} />
    </div>
  )
}
