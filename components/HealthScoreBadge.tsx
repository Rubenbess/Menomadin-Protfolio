import type { HealthScore } from '@/lib/types'

interface Props {
  score: HealthScore
  size?: 'sm' | 'md'
}

function color(total: number) {
  if (total >= 70) return { ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', label: 'Healthy' }
  if (total >= 40) return { ring: 'ring-amber-200',   bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500',   label: 'Monitor' }
  return            { ring: 'ring-red-200',    bg: 'bg-red-50',    text: 'text-red-600',    bar: 'bg-red-500',    label: 'At Risk' }
}

export function HealthScorePill({ score, size = 'sm' }: Props) {
  const c = color(score.total)
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
  const text = size === 'sm' ? 'text-xs' : 'text-sm'
  return (
    <span className={`inline-flex items-center gap-1 ${px} rounded-full ring-1 ${c.ring} ${c.bg} ${c.text} font-semibold ${text}`}>
      {score.total}
      <span className="font-normal opacity-70">/100</span>
    </span>
  )
}

export function HealthScoreBreakdown({ score }: { score: HealthScore }) {
  const c = color(score.total)

  const rows = [
    {
      label: 'KPI Trend',
      score: score.kpiScore,
      max: 30,
      detail: score.kpiTrend === 'up'   ? 'Revenue growing >5% QoQ' :
              score.kpiTrend === 'down' ? 'Revenue declining >5% QoQ' :
              score.kpiTrend === 'flat' ? 'Revenue roughly flat QoQ' :
              'No KPI data available',
    },
    {
      label: 'Runway',
      score: score.runwayScore,
      max: 30,
      detail: score.runwayMonths != null
        ? `${score.runwayMonths} months of runway`
        : 'No runway data available',
    },
    {
      label: 'Update Recency',
      score: score.updateScore,
      max: 20,
      detail: score.lastUpdateDays != null
        ? `Last update ${score.lastUpdateDays} days ago`
        : 'No company updates recorded',
    },
    {
      label: 'MOIC',
      score: score.moicScore,
      max: 20,
      detail: score.moic > 0
        ? `${score.moic.toFixed(2)}x current return`
        : 'No valuation data',
    },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Health Score</h3>
          <p className="text-xs text-slate-400 mt-0.5">Automated assessment based on KPIs, runway, updates &amp; MOIC</p>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-bold ${c.text}`}>{score.total}</span>
          <span className="text-sm text-slate-400">/100</span>
          <p className={`text-xs font-semibold mt-0.5 ${c.text}`}>{c.label}</p>
        </div>
      </div>

      {/* Overall bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div
          className={`h-full rounded-full transition-all ${c.bar}`}
          style={{ width: `${score.total}%` }}
        />
      </div>

      {/* Dimension rows */}
      <div className="space-y-3">
        {rows.map(row => (
          <div key={row.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600">{row.label}</span>
              <span className="text-xs text-slate-500 tabular-nums">{row.score}/{row.max}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  row.score / row.max >= 0.7 ? 'bg-emerald-500' :
                  row.score / row.max >= 0.4 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${(row.score / row.max) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{row.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
