'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'
import type { CompanyKPI, Round } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `${n}`
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

const LINE_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

// ── KPI Trend Chart ────────────────────────────────────────────────────────

const STANDARD_KPI_KEYS: { key: keyof CompanyKPI; label: string }[] = [
  { key: 'arr',          label: 'ARR' },
  { key: 'revenue',      label: 'Revenue' },
  { key: 'run_rate',     label: 'Run Rate' },
  { key: 'burn_rate',    label: 'Burn Rate' },
  { key: 'cash_runway',  label: 'Runway (mo)' },
  { key: 'headcount',    label: 'Headcount' },
  { key: 'gross_margin', label: 'Gross Margin %' },
]

export function KPITrendChart({ kpis }: { kpis: CompanyKPI[] }) {
  if (kpis.length < 2) return null

  const sorted = [...kpis].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Only plot metrics with at least 2 non-null values
  const activeKeys = STANDARD_KPI_KEYS.filter(
    ({ key }) => sorted.filter(k => k[key] != null).length >= 2
  )

  if (activeKeys.length === 0) return null

  const data = sorted.map(k => ({
    date: fmtDate(k.date),
    ...Object.fromEntries(activeKeys.map(({ key, label }) => [label, k[key] ?? null])),
  }))

  return (
    <div className="bg-neutral-50 rounded-lg p-4 mb-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-3">KPI Trends</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => fmtShort(Number(v))} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} />
          <Tooltip
            formatter={(v, name) => [fmtShort(Number(v)), name]}
            contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
          />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
          {activeKeys.map(({ label }, i) => (
            <Line
              key={label}
              type="monotone"
              dataKey={label}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Valuation History Chart ────────────────────────────────────────────────

export function ValuationChart({ rounds }: { rounds: Round[] }) {
  if (rounds.length < 2) return null

  const data = [...rounds]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter(r => r.post_money > 0)
    .map(r => ({
      name: `${r.type} (${fmtDate(r.date)})`,
      'Post-Money': r.post_money,
      'Pre-Money':  r.pre_money > 0 ? r.pre_money : null,
    }))

  if (data.length < 2) return null

  return (
    <div className="bg-neutral-50 rounded-lg p-4 mb-4 ring-1 ring-slate-200">
      <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-3">Valuation History</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={v => `$${(Number(v) / 1_000_000).toFixed(0)}M`}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            formatter={(v) => [`$${(Number(v) / 1_000_000).toFixed(1)}M`, '']}
            contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
          />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
          <Line type="monotone" dataKey="Post-Money" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed' }} />
          <Line type="monotone" dataKey="Pre-Money" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
