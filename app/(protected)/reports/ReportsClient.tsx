'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileSpreadsheet, FileText, Download, CheckCircle2, Users } from 'lucide-react'
import type { Round, Investment, CapTableEntry } from '@/lib/types'

interface CompanyWithMetrics {
  id: string
  name: string
  sector: string
  strategy: string
  hq: string
  status: string
  description: string | null
  totalInvested: number
  currentValue: number
  moic: number
  ownershipPct: number
}

interface Props {
  companies:   CompanyWithMetrics[]
  rounds:      Round[]
  investments: Investment[]
  capTable:    CapTableEntry[]
}

const fmt$ = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

// ── Excel helpers ─────────────────────────────────────────────────────────────

async function downloadExcel(filename: string, sheets: { name: string; rows: unknown[][] }[]) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows)
    // Auto column widths
    const cols = sheet.rows[0]?.map((_: unknown, i: number) => ({
      wch: Math.max(...sheet.rows.map(r => String(r[i] ?? '').length), 10),
    })) ?? []
    ws['!cols'] = cols
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  XLSX.writeFile(wb, filename)
}

// ── PDF helpers ───────────────────────────────────────────────────────────────

async function downloadPDF(
  filename: string,
  title: string,
  subtitle: string,
  tables: { title: string; head: string[]; body: (string | number)[][] }[]
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header
  doc.setFillColor(15, 15, 30)
  doc.rect(0, 0, 297, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 200)
  doc.text(subtitle, 14, 16)
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 283, 16, { align: 'right' })

  let y = 28

  for (const table of tables) {
    if (y > 170) { doc.addPage(); y = 14 }

    doc.setTextColor(30, 30, 60)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(table.title, 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [table.head],
      body: table.body,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  doc.save(filename)
}

// ── Report definitions ────────────────────────────────────────────────────────

interface ReportCardProps {
  title: string
  description: string
  onExcel: () => Promise<void>
  onPDF: () => Promise<void>
}

function ReportCard({ title, description, onExcel, onPDF }: ReportCardProps) {
  const [excelDone, setExcelDone] = useState(false)
  const [pdfDone,   setPdfDone]   = useState(false)
  const [loading,   setLoading]   = useState<'excel' | 'pdf' | null>(null)

  async function handle(type: 'excel' | 'pdf') {
    setLoading(type)
    try {
      if (type === 'excel') { await onExcel(); setExcelDone(true); setTimeout(() => setExcelDone(false), 2500) }
      else                  { await onPDF();   setPdfDone(true);   setTimeout(() => setPdfDone(false),   2500) }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText size={16} className="text-violet-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handle('excel')}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all disabled:opacity-50"
        >
          {excelDone
            ? <><CheckCircle2 size={13} /> Downloaded</>
            : loading === 'excel'
            ? 'Generating…'
            : <><FileSpreadsheet size={13} /> Excel</>}
        </button>
        <button
          onClick={() => handle('pdf')}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-all disabled:opacity-50"
        >
          {pdfDone
            ? <><CheckCircle2 size={13} /> Downloaded</>
            : loading === 'pdf'
            ? 'Generating…'
            : <><Download size={13} /> PDF</>}
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ReportsClient({ companies, rounds, investments, capTable }: Props) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── Portfolio Overview ──────────────────────────────────────────────────────

  async function portfolioExcel() {
    await downloadExcel('portfolio-overview.xlsx', [{
      name: 'Portfolio Overview',
      rows: [
        ['Company', 'Sector', 'Strategy', 'Status', 'HQ', 'Total Invested', 'Current Value', 'MOIC', 'Ownership %'],
        ...companies.map(c => [
          c.name, c.sector, c.strategy, c.status, c.hq ?? '',
          fmt$(c.totalInvested), fmt$(c.currentValue),
          `${c.moic.toFixed(2)}x`, `${c.ownershipPct.toFixed(2)}%`,
        ]),
        [],
        ['', '', '', '', 'TOTALS',
          fmt$(companies.reduce((s, c) => s + c.totalInvested, 0)),
          fmt$(companies.reduce((s, c) => s + c.currentValue, 0)),
          '', '',
        ],
      ],
    }])
  }

  async function portfolioPDF() {
    await downloadPDF(
      'portfolio-overview.pdf',
      'Menomadin Portfolio — Overview',
      `${companies.length} companies · As of ${date}`,
      [{
        title: 'Portfolio Companies',
        head: ['Company', 'Sector', 'Strategy', 'Status', 'HQ', 'Invested', 'Value', 'MOIC', 'Ownership'],
        body: companies.map(c => [
          c.name, c.sector, c.strategy, c.status, c.hq ?? '',
          fmt$(c.totalInvested), fmt$(c.currentValue),
          `${c.moic.toFixed(2)}x`, `${c.ownershipPct.toFixed(2)}%`,
        ]),
      }]
    )
  }

  // ── Investment History ──────────────────────────────────────────────────────

  async function investmentsExcel() {
    const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id
    await downloadExcel('investment-history.xlsx', [{
      name: 'Investments',
      rows: [
        ['Company', 'Date', 'Amount', 'Instrument', 'Valuation Cap'],
        ...investments.map(i => [
          companyName(i.company_id),
          new Date(i.date).toLocaleDateString(),
          fmt$(i.amount),
          i.instrument,
          i.valuation_cap ? fmt$(i.valuation_cap) : '—',
        ]),
      ],
    }])
  }

  async function investmentsPDF() {
    const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id
    await downloadPDF(
      'investment-history.pdf',
      'Menomadin Portfolio — Investment History',
      `${investments.length} transactions · As of ${date}`,
      [{
        title: 'Investment Transactions',
        head: ['Company', 'Date', 'Amount', 'Instrument', 'Valuation Cap'],
        body: investments.map(i => [
          companyName(i.company_id),
          new Date(i.date).toLocaleDateString(),
          fmt$(i.amount),
          i.instrument,
          i.valuation_cap ? fmt$(i.valuation_cap) : '—',
        ]),
      }]
    )
  }

  // ── Funding Rounds ──────────────────────────────────────────────────────────

  async function roundsExcel() {
    const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id
    await downloadExcel('funding-rounds.xlsx', [{
      name: 'Rounds',
      rows: [
        ['Company', 'Date', 'Type', 'Pre-Money', 'Post-Money', 'Amount Raised'],
        ...rounds.map(r => [
          companyName(r.company_id),
          new Date(r.date).toLocaleDateString(),
          r.type,
          fmt$(r.pre_money),
          fmt$(r.post_money),
          fmt$(r.amount_raised),
        ]),
      ],
    }])
  }

  async function roundsPDF() {
    const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id
    await downloadPDF(
      'funding-rounds.pdf',
      'Menomadin Portfolio — Funding Rounds',
      `${rounds.length} rounds · As of ${date}`,
      [{
        title: 'Funding Rounds',
        head: ['Company', 'Date', 'Type', 'Pre-Money', 'Post-Money', 'Amount Raised'],
        body: rounds.map(r => [
          companyName(r.company_id),
          new Date(r.date).toLocaleDateString(),
          r.type,
          fmt$(r.pre_money),
          fmt$(r.post_money),
          fmt$(r.amount_raised),
        ]),
      }]
    )
  }

  // ── Cap Table ───────────────────────────────────────────────────────────────

  async function capTableExcel() {
    const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id
    await downloadExcel('cap-table.xlsx', [{
      name: 'Cap Table',
      rows: [
        ['Company', 'Shareholder', 'Ownership %'],
        ...capTable.map(ct => [
          companyName(ct.company_id),
          ct.shareholder_name,
          `${ct.ownership_percentage.toFixed(2)}%`,
        ]),
      ],
    }])
  }

  async function capTablePDF() {
    const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id
    await downloadPDF(
      'cap-table.pdf',
      'Menomadin Portfolio — Cap Table',
      `${capTable.length} entries · As of ${date}`,
      [{
        title: 'Cap Table',
        head: ['Company', 'Shareholder', 'Ownership %'],
        body: capTable.map(ct => [
          companyName(ct.company_id),
          ct.shareholder_name,
          `${ct.ownership_percentage.toFixed(2)}%`,
        ]),
      }]
    )
  }

  // ── Full Portfolio Pack ─────────────────────────────────────────────────────

  async function fullPackExcel() {
    const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id
    await downloadExcel('menomadin-portfolio-pack.xlsx', [
      {
        name: 'Overview',
        rows: [
          ['Company', 'Sector', 'Strategy', 'Status', 'HQ', 'Invested', 'Value', 'MOIC', 'Ownership'],
          ...companies.map(c => [
            c.name, c.sector, c.strategy, c.status, c.hq ?? '',
            fmt$(c.totalInvested), fmt$(c.currentValue),
            `${c.moic.toFixed(2)}x`, `${c.ownershipPct.toFixed(2)}%`,
          ]),
        ],
      },
      {
        name: 'Investments',
        rows: [
          ['Company', 'Date', 'Amount', 'Instrument', 'Valuation Cap'],
          ...investments.map(i => [
            companyName(i.company_id),
            new Date(i.date).toLocaleDateString(),
            fmt$(i.amount), i.instrument,
            i.valuation_cap ? fmt$(i.valuation_cap) : '—',
          ]),
        ],
      },
      {
        name: 'Rounds',
        rows: [
          ['Company', 'Date', 'Type', 'Pre-Money', 'Post-Money', 'Amount Raised'],
          ...rounds.map(r => [
            companyName(r.company_id),
            new Date(r.date).toLocaleDateString(),
            r.type, fmt$(r.pre_money), fmt$(r.post_money), fmt$(r.amount_raised),
          ]),
        ],
      },
      {
        name: 'Cap Table',
        rows: [
          ['Company', 'Shareholder', 'Ownership %'],
          ...capTable.map(ct => [
            companyName(ct.company_id),
            ct.shareholder_name,
            `${ct.ownership_percentage.toFixed(2)}%`,
          ]),
        ],
      },
    ])
  }

  async function fullPackPDF() {
    const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id
    await downloadPDF(
      'menomadin-portfolio-pack.pdf',
      'Menomadin Portfolio — Full Report',
      `As of ${date}`,
      [
        {
          title: 'Portfolio Overview',
          head: ['Company', 'Sector', 'Strategy', 'Status', 'Invested', 'Value', 'MOIC', 'Ownership'],
          body: companies.map(c => [
            c.name, c.sector, c.strategy, c.status,
            fmt$(c.totalInvested), fmt$(c.currentValue),
            `${c.moic.toFixed(2)}x`, `${c.ownershipPct.toFixed(2)}%`,
          ]),
        },
        {
          title: 'Investment Transactions',
          head: ['Company', 'Date', 'Amount', 'Instrument', 'Valuation Cap'],
          body: investments.map(i => [
            companyName(i.company_id),
            new Date(i.date).toLocaleDateString(),
            fmt$(i.amount), i.instrument,
            i.valuation_cap ? fmt$(i.valuation_cap) : '—',
          ]),
        },
        {
          title: 'Cap Table',
          head: ['Company', 'Shareholder', 'Ownership %'],
          body: capTable.map(ct => [
            companyName(ct.company_id),
            ct.shareholder_name,
            `${ct.ownership_percentage.toFixed(2)}%`,
          ]),
        },
      ]
    )
  }

  const totalInvested    = companies.reduce((s, c) => s + c.totalInvested, 0)
  const totalValue       = companies.reduce((s, c) => s + c.currentValue,  0)
  const overallMoic      = totalInvested > 0 ? totalValue / totalInvested : 0

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-slate-400 mt-1">Download portfolio reports as Excel or PDF</p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Companies',       value: companies.length },
          { label: 'Total Invested',  value: fmt$(totalInvested) },
          { label: 'Portfolio Value', value: fmt$(totalValue) },
          { label: 'Overall MOIC',    value: `${overallMoic.toFixed(2)}x` },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-base font-bold text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* LP Update CTA */}
      <div className="mb-4">
        <Link
          href="/reports/lp-update"
          className="flex items-center justify-between bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5 hover:shadow-card-hover transition-shadow group"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users size={16} className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">LP Portfolio Update</h3>
              <p className="text-xs text-slate-400 mt-0.5">Live report with highlights, KPIs and portfolio metrics — export to PDF</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-violet-600 group-hover:text-violet-700 flex-shrink-0 ml-4">Open →</span>
        </Link>
      </div>

      {/* Full pack */}
      <div className="mb-4">
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-2xl p-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <h3 className="text-sm font-bold">Full Portfolio Pack</h3>
              <p className="text-xs text-violet-200 mt-0.5">All reports in one file — overview, investments, rounds & cap table</p>
            </div>
            <div className="flex gap-2">
              <DownloadButton label="Excel" onClick={fullPackExcel} color="white" />
              <DownloadButton label="PDF"   onClick={fullPackPDF}   color="violet" />
            </div>
          </div>
        </div>
      </div>

      {/* Individual reports */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Individual Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReportCard
          title="Portfolio Overview"
          description="All companies with invested capital, current value, MOIC and ownership"
          onExcel={portfolioExcel}
          onPDF={portfolioPDF}
        />
        <ReportCard
          title="Investment History"
          description="Full transaction log with dates, amounts and instruments"
          onExcel={investmentsExcel}
          onPDF={investmentsPDF}
        />
        <ReportCard
          title="Funding Rounds"
          description="All rounds with pre/post-money valuations and amounts raised"
          onExcel={roundsExcel}
          onPDF={roundsPDF}
        />
        <ReportCard
          title="Cap Table"
          description="Shareholder ownership percentages across all portfolio companies"
          onExcel={capTableExcel}
          onPDF={capTablePDF}
        />
      </div>
    </div>
  )
}

// Small inline button used in the full-pack card
function DownloadButton({ label, onClick, color }: { label: string; onClick: () => Promise<void>; color: 'white' | 'violet' }) {
  const [done,    setDone]    = useState(false)
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    await onClick()
    setLoading(false)
    setDone(true)
    setTimeout(() => setDone(false), 2500)
  }

  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all'
  const cls  = color === 'white'
    ? `${base} bg-white text-violet-700 hover:bg-violet-50`
    : `${base} bg-violet-500 text-white hover:bg-violet-400 ring-1 ring-white/20`

  return (
    <button onClick={handle} disabled={loading} className={cls}>
      {done ? <CheckCircle2 size={12} /> : <Download size={12} />}
      {done ? 'Done' : loading ? '…' : label}
    </button>
  )
}
