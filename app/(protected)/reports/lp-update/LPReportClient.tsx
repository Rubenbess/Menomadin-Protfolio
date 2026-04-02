'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, CheckCircle2, CalendarDays } from 'lucide-react'
import type { CompanyKPI, CompanyUpdate } from '@/lib/types'
import { calcMOIC, fmt$$, fmtMultiple, fmtPct } from '@/lib/calculations'
import { CATEGORY_COLORS } from '@/components/forms/UpdateForm'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompanyRow {
  id: string
  name: string
  sector: string
  strategy: string
  hq: string
  status: string
  entry_stage: string | null
  logo_url: string | null
  totalInvested: number
  currentValue: number
  moic: number
  ownershipPct: number
}

interface Props {
  companies:          CompanyRow[]
  updates:            CompanyUpdate[]
  latestKpis:         (CompanyKPI & { companyName: string })[]
  totalInvested:      number
  totalCurrentValue:  number
  tvpi:               number
  irr:                number | null
  activeCount:        number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '30 days',  days: 30 },
  { label: '90 days',  days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year',   days: 365 },
]

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtKpiVal(v: number | null) {
  if (v == null) return '—'
  return fmt$$(v)
}

// ── PDF export ────────────────────────────────────────────────────────────────

async function exportPDF(
  companies: CompanyRow[],
  updates: CompanyUpdate[],
  latestKpis: (CompanyKPI & { companyName: string })[],
  totalInvested: number,
  totalCurrentValue: number,
  tvpi: number,
  irr: number | null,
  activeCount: number,
  periodLabel: string,
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Cover header ──
  doc.setFillColor(15, 15, 30)
  doc.rect(0, 0, 297, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Menomadin Group — LP Portfolio Update', 14, 12)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 210)
  doc.text(`As of ${today}   ·   CONFIDENTIAL`, 14, 19)
  doc.text(`Period: Last ${periodLabel}`, 283, 19, { align: 'right' })

  // ── Summary metrics ──
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 60)
  const metrics = [
    ['Active Companies', String(activeCount)],
    ['Total Deployed',   fmt$$(totalInvested)],
    ['Portfolio Value',  fmt$$(totalCurrentValue)],
    ['TVPI',            fmtMultiple(tvpi)],
    ['IRR',             irr != null ? `${(irr * 100).toFixed(1)}%` : 'N/A'],
  ]
  const colW = 50
  metrics.forEach(([label, value], i) => {
    const x = 14 + i * colW
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 150)
    doc.text(label.toUpperCase(), x, 36)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 60)
    doc.text(value, x, 43)
  })

  // ── Portfolio table ──
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 60)
  doc.text('Portfolio Companies', 14, 55)

  autoTable(doc, {
    startY: 58,
    head: [['Company', 'Sector', 'Strategy', 'Status', 'Stage', 'Deployed', 'Value', 'MOIC', 'Ownership']],
    body: companies.map(c => [
      c.name,
      c.sector,
      c.strategy === 'impact' ? 'Impact' : 'Ventures',
      c.status,
      c.entry_stage ?? '—',
      c.totalInvested > 0 ? fmt$$(c.totalInvested) : '—',
      c.currentValue  > 0 ? fmt$$(c.currentValue)  : '—',
      c.totalInvested > 0 ? fmtMultiple(c.moic)    : '—',
      c.ownershipPct  > 0 ? fmtPct(c.ownershipPct) : '—',
    ]),
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  })

  // ── Recent updates table ──
  if (updates.length > 0) {
    doc.addPage()
    doc.setFillColor(15, 15, 30)
    doc.rect(0, 0, 297, 14, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Recent Highlights', 14, 10)

    autoTable(doc, {
      startY: 18,
      head: [['Date', 'Company', 'Category', 'Title', 'Notes']],
      body: updates.slice(0, 30).map(u => [
        fmtDate(u.date),
        u.company_id,
        u.category,
        u.title,
        u.notes ?? '',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 4: { cellWidth: 80 } },
      margin: { left: 14, right: 14 },
    })
  }

  // ── KPI snapshot ──
  const kpisWithData = latestKpis.filter(k =>
    k.arr || k.revenue || k.burn_rate || k.headcount
  )
  if (kpisWithData.length > 0) {
    doc.addPage()
    doc.setFillColor(15, 15, 30)
    doc.rect(0, 0, 297, 14, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('KPI Snapshot (Latest per Company)', 14, 10)

    autoTable(doc, {
      startY: 18,
      head: [['Company', 'As of', 'ARR', 'Revenue', 'Burn Rate', 'Runway (mo)', 'Headcount']],
      body: kpisWithData.map(k => [
        k.companyName,
        fmtDate(k.date),
        fmtKpiVal(k.arr),
        fmtKpiVal(k.revenue),
        fmtKpiVal(k.burn_rate),
        k.cash_runway != null ? String(k.cash_runway) : '—',
        k.headcount != null ? String(k.headcount) : '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })
  }

  // ── Footer on all pages ──
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 180)
    doc.text('CONFIDENTIAL — Prepared for Limited Partners only. Not for redistribution.', 14, 207)
    doc.text(`Page ${i} of ${pageCount}`, 283, 207, { align: 'right' })
  }

  doc.save(`menomadin-lp-update-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LPReportClient({
  companies,
  updates,
  latestKpis,
  totalInvested,
  totalCurrentValue,
  tvpi,
  irr,
  activeCount,
}: Props) {
  const [periodDays, setPeriodDays] = useState(90)
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const cutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - periodDays)
    return d
  }, [periodDays])

  const filteredUpdates = useMemo(() =>
    updates.filter(u => new Date(u.date) >= cutoff),
    [updates, cutoff]
  )

  const impactCos  = companies.filter(c => c.strategy === 'impact')
  const ventureCos = companies.filter(c => c.strategy === 'venture')
  const impactVal  = impactCos.reduce((s, c) => s + c.currentValue, 0)
  const ventureVal = ventureCos.reduce((s, c) => s + c.currentValue, 0)
  const impactDep  = impactCos.reduce((s, c) => s + c.totalInvested, 0)
  const ventureDep = ventureCos.reduce((s, c) => s + c.totalInvested, 0)

  const updatesByCategory = useMemo(() => {
    const map: Record<string, CompanyUpdate[]> = {}
    for (const u of filteredUpdates) {
      ;(map[u.category] ??= []).push(u)
    }
    return map
  }, [filteredUpdates])

  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id

  async function handleExport() {
    setExporting(true)
    const periodLabel = PERIODS.find(p => p.days === periodDays)?.label ?? `${periodDays} days`
    try {
      await exportPDF(
        companies, filteredUpdates, latestKpis,
        totalInvested, totalCurrentValue, tvpi, irr, activeCount,
        periodLabel,
      )
      setExported(true)
      setTimeout(() => setExported(false), 3000)
    } finally {
      setExporting(false)
    }
  }

  const kpisWithData = latestKpis.filter(k => k.arr || k.revenue || k.burn_rate || k.headcount)

  return (
    <div className="max-w-5xl animate-fade-in">

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/reports"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} /> Reports
        </Link>
        <span className="text-slate-200">/</span>
        <span className="text-sm font-medium text-slate-700">LP Update</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1">
            <CalendarDays size={13} className="text-slate-400 ml-1" />
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setPeriodDays(p.days)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  periodDays === p.days
                    ? 'bg-gold-500 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {exported
              ? <><CheckCircle2 size={14} /> Exported</>
              : exporting
              ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Generating…</>
              : <><Download size={14} /> Export PDF</>
            }
          </button>
        </div>
      </div>

      {/* Report header */}
      <div
        className="rounded-2xl px-8 py-7 mb-6 text-white"
        style={{ background: 'linear-gradient(135deg, #0f0f1e 0%, #1e1240 100%)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gold-200 text-xs font-semibold uppercase tracking-widest mb-2">LP Portfolio Update</p>
            <h1 className="text-2xl font-bold tracking-tight">Menomadin Group</h1>
            <p className="text-slate-400 text-sm mt-1">As of {today}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 text-xs font-medium border border-white/10">
              CONFIDENTIAL
            </span>
          </div>
        </div>

        {/* Metric strip */}
        <div className="grid grid-cols-5 gap-4 mt-7 pt-7 border-t border-white/10">
          {[
            { label: 'Active Companies',  value: String(activeCount) },
            { label: 'Total Deployed',    value: fmt$$(totalInvested) },
            { label: 'Portfolio Value',   value: fmt$$(totalCurrentValue) },
            { label: 'TVPI',              value: fmtMultiple(tvpi) },
            { label: 'IRR',               value: irr != null ? `${(irr * 100).toFixed(1)}%` : 'N/A' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">{label}</p>
              <p className="text-xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-slate-900">Menomadin Impact</span>
            <span className="ml-auto text-xs text-slate-400">{impactCos.length} companies</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Deployed</p><p className="text-base font-bold text-slate-900 mt-1">{fmt$$(impactDep)}</p></div>
            <div><p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Value</p><p className="text-base font-bold text-slate-900 mt-1">{fmt$$(impactVal)}</p></div>
            <div><p className="text-xs text-slate-400 uppercase tracking-wider font-medium">MOIC</p><p className="text-base font-bold text-emerald-600 mt-1">{fmtMultiple(calcMOIC(impactVal, impactDep))}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-slate-900">Menomadin Ventures</span>
            <span className="ml-auto text-xs text-slate-400">{ventureCos.length} companies</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Deployed</p><p className="text-base font-bold text-slate-900 mt-1">{fmt$$(ventureDep)}</p></div>
            <div><p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Value</p><p className="text-base font-bold text-slate-900 mt-1">{fmt$$(ventureVal)}</p></div>
            <div><p className="text-xs text-slate-400 uppercase tracking-wider font-medium">MOIC</p><p className="text-base font-bold text-blue-600 mt-1">{fmtMultiple(calcMOIC(ventureVal, ventureDep))}</p></div>
          </div>
        </div>
      </div>

      {/* Portfolio companies table */}
      <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Portfolio Companies</h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">{companies.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {['Company', 'Sector', 'Strategy', 'Status', 'Stage', 'Deployed', 'Value', 'MOIC', 'Ownership'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${h === 'Company' ? 'text-left pl-5' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {companies.map(co => (
                <tr key={co.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      {co.logo_url
                        ? <img src={co.logo_url} alt={co.name} className="w-6 h-6 rounded-md object-contain bg-slate-50 ring-1 ring-slate-100 flex-shrink-0" />
                        : <div className="w-6 h-6 rounded-md bg-gold-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gold-500">{co.name[0]}</div>
                      }
                      <span className="font-semibold text-slate-900 text-sm">{co.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{co.sector}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${co.strategy === 'impact' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                      {co.strategy === 'impact' ? 'Impact' : 'Ventures'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      co.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      co.status === 'exited' ? 'bg-blue-100 text-blue-700' :
                      co.status === 'written-off' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {co.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">{co.entry_stage ?? <span className="text-slate-200">—</span>}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700 text-sm">{co.totalInvested > 0 ? fmt$$(co.totalInvested) : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700 text-sm">{co.currentValue  > 0 ? fmt$$(co.currentValue)  : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {co.totalInvested > 0
                      ? <span className={co.moic >= 1 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{fmtMultiple(co.moic)}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{co.ownershipPct > 0 ? fmtPct(co.ownershipPct) : <span className="text-slate-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent highlights */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent Highlights
            <span className="ml-2 text-xs font-normal text-slate-400">— last {PERIODS.find(p => p.days === periodDays)?.label}</span>
          </h2>
          <span className="text-xs text-slate-400">{filteredUpdates.length} updates</span>
        </div>

        {filteredUpdates.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] px-5 py-10 text-center">
            <p className="text-sm text-slate-400">No updates in this period.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(updatesByCategory).map(([category, catUpdates]) => (
              <div key={category} className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[category] ?? 'bg-slate-100 text-slate-700'}`}>
                    {category}
                  </span>
                  <span className="text-xs text-slate-400">{catUpdates.length} update{catUpdates.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {catUpdates.map(u => (
                    <div key={u.id} className="px-5 py-3.5 flex items-start gap-4">
                      <p className="text-xs text-slate-400 flex-shrink-0 w-24 pt-0.5">{fmtDate(u.date)}</p>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gold-500 mb-0.5">{companyName(u.company_id)}</p>
                        <p className="text-sm font-medium text-slate-800">{u.title}</p>
                        {u.notes && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{u.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Snapshot */}
      {kpisWithData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">KPI Snapshot <span className="text-xs font-normal text-slate-400 ml-1">— latest per company</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {['Company', 'As of', 'ARR', 'Revenue', 'Burn Rate', 'Runway (mo)', 'Headcount'].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${h === 'Company' ? 'text-left pl-5' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {kpisWithData.map(k => (
                  <tr key={k.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{k.companyName}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">{fmtDate(k.date)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtKpiVal(k.arr)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtKpiVal(k.revenue)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtKpiVal(k.burn_rate)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{k.cash_runway != null ? k.cash_runway : '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{k.headcount != null ? k.headcount : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confidentiality footer */}
      <p className="text-xs text-slate-300 text-center pb-8">
        CONFIDENTIAL — Prepared for Limited Partners only. Not for redistribution.
      </p>
    </div>
  )
}
