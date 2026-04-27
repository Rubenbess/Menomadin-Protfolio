'use client'

import { useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileSpreadsheet, FileText, Download, CheckCircle2, Users, ChevronLeft, TrendingUp, Upload, X, Mail, Plus, Trash2, ChevronDown } from 'lucide-react'
import type { Round, Investment, CapTableEntry } from '@/lib/types'
import type { DealReport, DealReportRecipient } from './page'
import { uploadDealReport, addDealReportRecipient, removeDealReportRecipient } from './actions'

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
  dealReports: DealReport[]
  recipients:  DealReportRecipient[]
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
    <div className="bg-white rounded-lg shadow-sm dark:shadow-md border border-neutral-200 dark:border-neutral-700 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 bg-gold-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText size={16} className="text-primary-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handle('excel')}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all disabled:opacity-50"
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
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border border-violet-200 text-primary-600 bg-gold-50 hover:bg-gold-100 transition-all disabled:opacity-50"
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

// ── Markdown components ───────────────────────────────────────────────────────

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{children}</h1>
  ),
  h2: ({ children }) => {
    const text = String(children)
    return (
      <h2 className="text-xs font-bold uppercase tracking-widest text-primary-500 mt-8 mb-4 pb-2 border-b border-primary-100 dark:border-primary-900">
        {text}
      </h2>
    )
  },
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-6 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="space-y-2 mb-4">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="flex gap-2 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
      <span className="text-primary-400 mt-1 flex-shrink-0">•</span>
      <span>{children}</span>
    </li>
  ),
  hr: () => <hr className="border-neutral-100 dark:border-neutral-800 my-6" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-6 rounded-lg border border-neutral-200 dark:border-neutral-700">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-neutral-50 dark:bg-neutral-800">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2.5 text-left font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-neutral-200 dark:border-neutral-700">
      {children}
    </th>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">{children}</tr>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 text-neutral-700 dark:text-neutral-300 align-top">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary-300 pl-4 my-4 text-sm text-neutral-600 dark:text-neutral-400 italic">
      {children}
    </blockquote>
  ),
}

// ── Deal report viewer ────────────────────────────────────────────────────────

function DealReportViewer({ report, onBack }: { report: DealReport; onBack: () => void }) {
  const weekOf = new Date(report.report_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  async function handleDownload() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 18
    const contentW = pageW - margin * 2
    let y = 36

    // ── Page header ────────────────────────────────────────────────────────────
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, pageW, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Menomadin — Israeli Tech Deal Report', margin, 12)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(199, 210, 254)
    doc.text(`Week of ${weekOf}`, margin, 21)
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      pageW - margin, 21, { align: 'right' }
    )

    // ── Helpers ────────────────────────────────────────────────────────────────
    function checkPage(needed = 8) {
      if (y + needed > pageH - 15) { doc.addPage(); y = 15 }
    }

    function stripInline(text: string) {
      return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/`(.+?)`/g, '$1')
    }

    function parseTableBlock(rows: string[]): { head: string[]; body: string[][] } | null {
      const dataRows = rows.filter(r => !r.match(/^\|[\s|:-]+\|$/))
      if (dataRows.length < 2) return null
      const head = dataRows[0].split('|').map(c => c.trim()).filter(Boolean)
      const body = dataRows.slice(1).map(r => r.split('|').map(c => c.trim()).filter(Boolean))
      return { head, body }
    }

    // ── Parse content into ordered blocks ──────────────────────────────────────
    type Block =
      | { type: 'h1' | 'h2' | 'h3' | 'hr' | 'bullet' | 'text'; text: string }
      | { type: 'table'; rows: string[] }
      | { type: 'blank' }

    const blocks: Block[] = []
    const rawLines = report.content.split('\n')
    let i = 0
    while (i < rawLines.length) {
      const line = rawLines[i]
      if (line.startsWith('|')) {
        const tableRows: string[] = []
        while (i < rawLines.length && rawLines[i].startsWith('|')) {
          tableRows.push(rawLines[i])
          i++
        }
        blocks.push({ type: 'table', rows: tableRows })
      } else if (line.startsWith('# '))       { blocks.push({ type: 'h1',     text: line.replace(/^# /, '') });  i++ }
      else if (line.startsWith('## '))        { blocks.push({ type: 'h2',     text: line.replace(/^## /, '') }); i++ }
      else if (line.startsWith('### '))       { blocks.push({ type: 'h3',     text: line.replace(/^### /, '') }); i++ }
      else if (line.match(/^-{3,}$/))         { blocks.push({ type: 'hr',     text: '' }); i++ }
      else if (line.match(/^[-*] /))          { blocks.push({ type: 'bullet', text: line.replace(/^[-*] /, '') }); i++ }
      else if (line.trim() !== '')            { blocks.push({ type: 'text',   text: line }); i++ }
      else                                    { blocks.push({ type: 'blank' }); i++ }
    }

    // ── Render blocks in order ─────────────────────────────────────────────────
    for (const block of blocks) {
      if (block.type === 'blank') {
        y += 2
      } else if (block.type === 'hr') {
        checkPage(6)
        doc.setDrawColor(220, 220, 235)
        doc.line(margin, y, pageW - margin, y)
        y += 5
      } else if (block.type === 'h1') {
        checkPage(12)
        y += 2
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(20, 20, 50)
        doc.text(stripInline(block.text), margin, y)
        y += 8
      } else if (block.type === 'h2') {
        checkPage(14)
        y += 4
        const label = stripInline(block.text).toUpperCase()
        doc.setFillColor(238, 242, 255)
        doc.rect(margin - 2, y - 5, contentW + 4, 9, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(79, 70, 229)
        doc.text(label, margin, y)
        y += 8
      } else if (block.type === 'h3') {
        checkPage(10)
        y += 3
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(20, 20, 50)
        const wrapped = doc.splitTextToSize(stripInline(block.text), contentW)
        doc.text(wrapped, margin, y)
        y += wrapped.length * 5.5 + 1
      } else if (block.type === 'bullet') {
        const text = stripInline(block.text)
        const wrapped = doc.splitTextToSize(text, contentW - 8)
        checkPage(wrapped.length * 5 + 3)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 50, 70)
        doc.setFillColor(79, 70, 229)
        doc.circle(margin + 1.5, y - 1.5, 1, 'F')
        doc.text(wrapped, margin + 6, y)
        y += wrapped.length * 5 + 2
      } else if (block.type === 'text') {
        const text = stripInline(block.text)
        const wrapped = doc.splitTextToSize(text, contentW)
        checkPage(wrapped.length * 5 + 2)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 50, 70)
        doc.text(wrapped, margin, y)
        y += wrapped.length * 5 + 2
      } else if (block.type === 'table') {
        const parsed = parseTableBlock(block.rows)
        if (!parsed) continue
        checkPage(30)
        autoTable(doc, {
          startY: y,
          head: [parsed.head],
          body: parsed.body,
          styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak', valign: 'top' },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 7 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: margin, right: margin },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28 } },
          didDrawPage: () => { y = 15 },
        })
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
      }
    }

    doc.save(`menomadin-deal-report-${report.report_date}.pdf`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <ChevronLeft size={16} /> Back to reports
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          <Download size={13} /> Download PDF
        </button>
      </div>

      <div className="card overflow-hidden">
        {/* Report header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-primary-200" />
            <span className="text-xs font-semibold text-primary-200 uppercase tracking-wider">Deal Report</span>
          </div>
          <p className="text-white font-bold text-lg">Israeli Tech Ecosystem</p>
          <p className="text-primary-200 text-sm mt-0.5">Week of {weekOf}</p>
        </div>

        {/* Report body */}
        <div className="px-6 py-6 max-w-none">
          <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

// ── Upload modal ──────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSaved }: { onClose: () => void; onSaved: (r: DealReport) => void }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => setContent(e.target?.result as string ?? '')
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleSave() {
    if (!date || !content.trim()) { setError('Date and report content are required.'); return }
    setSaving(true)
    setError('')
    try {
      await uploadDealReport(date, content.trim())
      onSaved({ id: crypto.randomUUID(), report_date: date, content: content.trim(), created_at: new Date().toISOString() })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save report.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Upload Deal Report</p>
            <p className="text-xs text-neutral-500 mt-0.5">Paste markdown or drop a .md file</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={16} className="text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto flex-1">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Report Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          {/* Drop zone + textarea */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Report Content (Markdown)</label>
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="relative"
            >
              {!content && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-neutral-300 gap-1">
                  <Upload size={20} />
                  <span className="text-xs">Drop a .md file here or paste below</span>
                </div>
              )}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={14}
                placeholder=""
                className="w-full px-3 py-2.5 text-xs font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none leading-relaxed"
              />
            </div>
            {/* File input fallback */}
            <label className="mt-2 flex items-center gap-2 text-xs text-primary-500 hover:text-primary-600 cursor-pointer w-fit">
              <Upload size={13} />
              Choose .md file
              <input
                type="file"
                accept=".md,text/markdown,text/plain"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </label>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Recipients panel ──────────────────────────────────────────────────────────

function RecipientsPanel({ initialRecipients }: { initialRecipients: DealReportRecipient[] }) {
  const [open, setOpen] = useState(true)
  const [recipients, setRecipients] = useState(initialRecipients)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    setError('')
    try {
      await addDealReportRecipient(email, name)
      setRecipients(prev => [...prev, { id: crypto.randomUUID(), email: email.trim().toLowerCase(), name: name.trim() || null }])
      setEmail('')
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add recipient.')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(id: string) {
    await removeDealReportRecipient(id)
    setRecipients(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="mb-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <Mail size={14} className="text-primary-500" />
          Email Recipients
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-xs font-bold">
            {recipients.length}
          </span>
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 pb-4 pt-3 flex flex-col gap-3">
          {recipients.length === 0 ? (
            <p className="text-xs text-neutral-400">No recipients yet. Add one below.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {recipients.map(r => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                  <span>
                    {r.name && <span className="font-medium mr-1.5">{r.name}</span>}
                    <span className="text-neutral-500">{r.email}</span>
                  </span>
                  <button
                    onClick={() => handleRemove(r.id)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAdd} className="flex gap-2 mt-1">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name (optional)"
              className="w-28 px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <button
              type="submit"
              disabled={adding || !email.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              <Plus size={12} />
              {adding ? '…' : 'Add'}
            </button>
          </form>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ── Deal Reports tab ──────────────────────────────────────────────────────────

function DealReportsTab({ reports: initialReports, initialRecipients }: { reports: DealReport[]; initialRecipients: DealReportRecipient[] }) {
  const [reports, setReports] = useState(initialReports)
  const [selected, setSelected] = useState<DealReport | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  function handleSaved(report: DealReport) {
    setReports(prev => [report, ...prev].sort((a, b) => b.report_date.localeCompare(a.report_date)))
    setShowUpload(false)
    setSelected(report)
  }

  if (selected) {
    return (
      <>
        <DealReportViewer report={selected} onBack={() => setSelected(null)} />
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSaved={handleSaved} />}
      </>
    )
  }

  return (
    <>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSaved={handleSaved} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-neutral-500">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
        >
          <Upload size={13} /> Upload Report
        </button>
      </div>

      <RecipientsPanel initialRecipients={initialRecipients} />

      {reports.length === 0 ? (
        <div className="card p-12 text-center">
          <TrendingUp size={32} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No deal reports yet</p>
          <p className="text-xs text-neutral-400 mt-1">Upload a report or wait for the Monday automatic brief</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map(report => (
            <button
              key={report.id}
              onClick={() => setSelected(report)}
              className="card p-5 text-left hover:shadow-md transition-shadow group flex items-center justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-gold-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={16} className="text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Israeli Tech Deal Report
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Week of {new Date(report.report_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary-500 group-hover:text-primary-600 flex-shrink-0 ml-4">Read →</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ReportsClient({ companies, rounds, investments, capTable, dealReports, recipients }: Props) {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'deals'>('portfolio')
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
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="page-header border-b border-neutral-200 dark:border-neutral-700">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {activeTab === 'portfolio' ? 'Download portfolio reports as Excel or PDF' : 'Weekly Israeli tech ecosystem deal briefs'}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-6 pt-4 border-b border-neutral-200 dark:border-neutral-700">
        {([
          { key: 'portfolio', label: 'Portfolio Reports' },
          { key: 'deals',     label: `Deal Reports${dealReports.length > 0 ? ` (${dealReports.length})` : ''}` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
      {activeTab === 'deals' ? (
        <DealReportsTab reports={dealReports} initialRecipients={recipients} />
      ) : (<>

      {/* Summary bar */}
      <div className="card p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Companies',       value: companies.length },
          { label: 'Total Invested',  value: fmt$(totalInvested) },
          { label: 'Portfolio Value', value: fmt$(totalValue) },
          { label: 'Overall MOIC',    value: `${overallMoic.toFixed(2)}x` },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{label}</p>
            <p className="text-base font-bold text-neutral-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* LP Update CTA */}
      <div className="mb-4">
        <Link
          href="/reports/lp-update"
          className="flex items-center justify-between card p-5 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-gold-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users size={16} className="text-primary-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">LP Portfolio Update</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Live report with highlights, KPIs and portfolio metrics — export to PDF</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary-500 group-hover:text-primary-600 flex-shrink-0 ml-4">Open →</span>
        </Link>
      </div>

      {/* Full pack */}
      <div className="mb-4">
        <div className="bg-gradient-to-r from-gold-500 to-gold-600 rounded-lg p-5 text-white">
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
      <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Individual Reports</h2>
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
      </>)}
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
    ? `${base} bg-white text-primary-600 hover:bg-gold-50`
    : `${base} bg-primary-500 text-white hover:bg-gold-300 ring-1 ring-white/20`

  return (
    <button onClick={handle} disabled={loading} className={cls}>
      {done ? <CheckCircle2 size={12} /> : <Download size={12} />}
      {done ? 'Done' : loading ? '…' : label}
    </button>
  )
}
