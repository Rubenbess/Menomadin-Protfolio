'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area, ReferenceLine,
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

const SECTOR_COLORS = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#06b6d4', '#f97316',
]

const STATUS_COLORS: Record<string, string> = {
  active:        '#10b981',
  exited:        '#3b82f6',
  watchlist:     '#f59e0b',
  'written-off': '#ef4444',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

// ── Invested vs Value bar chart ───────────────────────────────────────────

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
    <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Invested vs Current Value</h3>
      <p className="text-xs text-slate-400 mb-4">Per company, sorted by amount invested</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap="30%" barGap={3}>
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
            formatter={(v) => [fmt(Number(v)), '']}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontSize: 12 }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Bar dataKey="Invested" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Value"    fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-2 justify-center">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-violet-600 inline-block" /> Invested
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Current Value
        </span>
      </div>
    </div>
  )
}

// ── Sector allocation donut ───────────────────────────────────────────────

function SectorChart({ companies }: Props) {
  const sectorMap: Record<string, number> = {}
  for (const c of companies) {
    const s = normalizeSector(c.sector || 'Other')
    sectorMap[s] = (sectorMap[s] ?? 0) + c.totalInvested
  }

  const data = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Sector Allocation</h3>
      <p className="text-xs text-slate-400 mb-2">By capital invested</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [fmt(Number(v)), 'Invested']}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontSize: 12 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#64748b' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── MOIC ranking bars ─────────────────────────────────────────────────────

function MoicChart({ companies }: Props) {
  const data = companies
    .filter(c => c.moic > 0)
    .sort((a, b) => b.moic - a.moic)
    .slice(0, 10)
    .map(c => ({
      name: c.name.length > 16 ? c.name.slice(0, 15) + '…' : c.name,
      moic: parseFloat(c.moic.toFixed(2)),
    }))

  if (data.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">MOIC by Company</h3>
      <p className="text-xs text-slate-400 mb-4">Top performers ranked by return multiple</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" barCategoryGap="25%">
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
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            formatter={(v) => [`${Number(v)}x`, 'MOIC']}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontSize: 12 }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Bar dataKey="moic" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.moic >= 2 ? '#10b981' : entry.moic >= 1 ? '#7c3aed' : '#f59e0b'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Status breakdown ──────────────────────────────────────────────────────

function StatusBreakdown({ companies }: Props) {
  const counts: Record<string, number> = {}
  for (const c of companies) {
    counts[c.status] = (counts[c.status] ?? 0) + 1
  }

  const total = companies.length
  if (total === 0) return null

  const statuses = [
    { key: 'active',        label: 'Active' },
    { key: 'exited',        label: 'Exited' },
    { key: 'watchlist',     label: 'Watchlist' },
    { key: 'written-off',   label: 'Written off' },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Portfolio Status</h3>
      <p className="text-xs text-slate-400 mb-4">Company health at a glance</p>
      <div className="space-y-3">
        {statuses.map(({ key, label }) => {
          const count = counts[key] ?? 0
          const pct = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">{label}</span>
                <span className="text-xs text-slate-400">{count} / {total}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[key] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── J-Curve (fund cash flow) ──────────────────────────────────────────────

function JCurveChart({ investments }: { investments: InvestmentData[] }) {
  if (!investments || investments.length === 0) return null

  // Group by quarter, accumulate cumulative net cash flow (deployed = negative)
  const quarterMap: Record<string, number> = {}
  for (const inv of investments) {
    if (!inv.date || !inv.amount) continue
    const d = new Date(inv.date)
    const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`
    quarterMap[q] = (quarterMap[q] ?? 0) + inv.amount
  }

  const sorted = Object.entries(quarterMap).sort(([a], [b]) => {
    const parse = (s: string) => { const [q, y] = s.split(' '); return Number(y) * 4 + Number(q[1]) }
    return parse(a) - parse(b)
  })

  let cumulative = 0
  const data = sorted.map(([period, deployed]) => {
    cumulative -= deployed   // deployed capital is cash out (negative)
    return { period, cumulative }
  })

  if (data.length === 0) return null

  const minVal = Math.min(...data.map(d => d.cumulative))
  const maxVal = Math.max(...data.map(d => d.cumulative), 0)

  return (
    <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Fund Cash Flow (J-Curve)</h3>
      <p className="text-xs text-slate-400 mb-4">Cumulative net cash flow over time — capital deployed by quarter</p>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="jcurveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => `$${Math.abs(v / 1_000_000).toFixed(1)}M`}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={56}
            domain={[minVal * 1.1, maxVal * 1.1 || 1]}
          />
          <Tooltip
            formatter={(v) => [`-$${Math.abs(Number(v) / 1_000_000).toFixed(2)}M`, 'Net Cash Flow']}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#jcurveGrad)"
            dot={{ fill: '#7c3aed', r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────

export default function DashboardCharts({ companies, investments = [] }: Props) {
  if (companies.length === 0) return null

  return (
    <div className="space-y-4 mb-8">
      {/* Full-width performance chart */}
      <PerformanceChart companies={companies} />

      {/* Two-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MoicChart companies={companies} />
        </div>
        <SectorChart companies={companies} />
      </div>

      {/* Status breakdown */}
      <StatusBreakdown companies={companies} />

      {/* J-Curve */}
      <JCurveChart investments={investments} />
    </div>
  )
}
