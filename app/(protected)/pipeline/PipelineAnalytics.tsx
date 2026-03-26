'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, FunnelChart, Funnel, LabelList,
} from 'recharts'
import type { PipelineEntry } from '@/lib/types'

interface Stage { id: string; name: string; color: string; position: number }

interface Props {
  entries: PipelineEntry[]
  stages: Stage[]
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316']

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #f1f5f9',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  fontSize: 12,
  padding: '8px 12px',
}

function fmtMoney(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export default function PipelineAnalytics({ entries, stages }: Props) {
  const stageNames = new Set(stages.map(s => s.name))
  const visible = entries.filter(e => stageNames.has(e.status))

  // — Funnel: deals per stage
  const funnelData = stages.map(s => ({
    name: s.name,
    value: entries.filter(e => e.status === s.name).length,
  })).filter(d => d.value > 0)

  // — Source breakdown
  const sourceMap: Record<string, number> = {}
  for (const e of visible) {
    const src = e.source || 'Unknown'
    sourceMap[src] = (sourceMap[src] ?? 0) + 1
  }
  const sourceData = Object.entries(sourceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // — Sector breakdown
  const sectorMap: Record<string, number> = {}
  for (const e of visible) {
    const sec = e.sector || 'Unknown'
    sectorMap[sec] = (sectorMap[sec] ?? 0) + 1
  }
  const sectorData = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // — Avg fundraising ask per stage
  const askByStage = stages.map(s => {
    const stageEntries = entries.filter(e => e.status === s.name && e.fundraising_ask)
    const avg = stageEntries.length
      ? stageEntries.reduce((sum, e) => sum + (e.fundraising_ask ?? 0), 0) / stageEntries.length
      : 0
    return { name: s.name, avg }
  }).filter(d => d.avg > 0)

  // — Avg days per stage (since created_at)
  const avgDaysByStage = stages.map(s => {
    const stageEntries = entries.filter(e => e.status === s.name)
    if (!stageEntries.length) return null
    const avg = stageEntries.reduce((sum, e) =>
      sum + (Date.now() - new Date(e.created_at).getTime()) / 86_400_000, 0
    ) / stageEntries.length
    return { name: s.name, days: Math.round(avg) }
  }).filter(Boolean) as { name: string; days: number }[]

  // — Score distribution
  const scoreDist = [1, 2, 3, 4, 5].map(i => ({
    score: `${i}★`,
    count: visible.filter(e => e.internal_score === i).length,
  }))

  const card = 'bg-white rounded-2xl p-6 border border-slate-100'

  return (
    <div className="space-y-4">

      {/* Stage funnel */}
      <div className={card}>
        <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Pipeline Funnel</h3>
        <p className="text-xs text-slate-400 mb-4">Deals per stage</p>
        <div className="flex items-end gap-1.5">
          {stages.map((s, i) => {
            const count = entries.filter(e => e.status === s.name).length
            const max = Math.max(...stages.map(st => entries.filter(e => e.status === st.name).length), 1)
            const pct = (count / max) * 100
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-slate-700">{count}</span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{ height: Math.max(pct * 1.6, 4), background: COLORS[i % COLORS.length] }}
                />
                <span className="text-[10px] text-slate-400 text-center leading-tight" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Source breakdown */}
        {sourceData.length > 0 && (
          <div className={card}>
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Deal Sources</h3>
            <p className="text-xs text-slate-400 mb-4">Where deals come from</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceData} layout="vertical" barCategoryGap="25%" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" name="Deals" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#94a3b8' }}>
                  {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sector breakdown */}
        {sectorData.length > 0 && (
          <div className={card}>
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Sectors in Pipeline</h3>
            <p className="text-xs text-slate-400 mb-4">Deal count by sector</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectorData} layout="vertical" barCategoryGap="25%" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" name="Deals" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#94a3b8' }}>
                  {sectorData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Avg days per stage */}
        {avgDaysByStage.length > 0 && (
          <div className={card}>
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Avg. Days Active</h3>
            <p className="text-xs text-slate-400 mb-4">Average time deals spend per stage</p>
            <ResponsiveContainer width="100%" height={Math.max(avgDaysByStage.length * 32 + 20, 120)}>
              <BarChart data={avgDaysByStage} layout="vertical" barCategoryGap="25%" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={v => `${v}d`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip formatter={(v) => [`${v} days`, 'Avg. Days']} contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="days" name="Days" fill="#6366f1" radius={[0, 4, 4, 0]}
                  label={{ position: 'right', fontSize: 11, fill: '#94a3b8', formatter: (v: unknown) => `${v}d` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Score distribution */}
        {visible.some(e => e.internal_score) && (
          <div className={card}>
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Internal Score Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">How deals are rated by the team</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={scoreDist} barCategoryGap="35%" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="score" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc', radius: 4 }} />
                <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                  {scoreDist.map((_, i) => (
                    <Cell key={i} fill={i >= 3 ? '#10b981' : i >= 2 ? '#f59e0b' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Avg ask by stage */}
      {askByStage.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Avg. Fundraising Ask by Stage</h3>
          <p className="text-xs text-slate-400 mb-4">For deals with a declared fundraising amount</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={askByStage} barCategoryGap="35%" margin={{ top: 0, right: 4, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtMoney} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip formatter={(v) => [fmtMoney(Number(v)), 'Avg. Ask']} contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc', radius: 4 }} />
              <Bar dataKey="avg" name="Avg Ask" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
