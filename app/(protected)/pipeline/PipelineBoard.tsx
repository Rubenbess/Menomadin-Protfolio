'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { Plus, Pencil, Trash2, GripVertical, MoreHorizontal, X, Paperclip, BarChart2, Sparkles, Search, Download, Loader2 } from 'lucide-react'
import PipelineAnalytics from './PipelineAnalytics'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import PipelineForm from '@/components/forms/PipelineForm'
import StageForm from '@/components/forms/StageForm'
import { movePipelineCard, deleteStage } from '@/actions/pipeline-stages'
import { deletePipelineEntry } from '@/actions/pipeline'
import DealTasks from './DealTasks'
import type { PipelineEntry } from '@/lib/types'

// ── Color maps ────────────────────────────────────────────────────────────

const COLOR_HEADER: Record<string, string> = {
  slate:  'bg-neutral-100 text-neutral-800 border-neutral-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  indigo: 'bg-gold-100 text-primary-600 border-violet-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  amber:  'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  green:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  red:    'bg-red-100 text-red-700 border-red-200',
}

const COLOR_DOT: Record<string, string> = {
  slate:  'bg-slate-400',
  blue:   'bg-blue-500',
  indigo: 'bg-primary-500',
  purple: 'bg-purple-500',
  amber:  'bg-amber-400',
  orange: 'bg-orange-400',
  green:  'bg-emerald-500',
  red:    'bg-red-500',
}

// ── Types ─────────────────────────────────────────────────────────────────

interface Stage {
  id: string
  name: string
  color: string
  position: number
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function fmtAsk(n: number | null) {
  if (!n) return null
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M ask`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K ask`
  return `$${n} ask`
}

function StarRow({ score, size = 14 }: { score: number | null; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" style={{ width: size, height: size }}
          className={i <= (score ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  )
}

// ── Analytics Bar ─────────────────────────────────────────────────────────

function AnalyticsBar({ entries, stages }: { entries: PipelineEntry[]; stages: Stage[] }) {
  const stageNames = new Set(stages.map(s => s.name))
  const visibleEntries = entries.filter(e => stageNames.has(e.status))
  const total = visibleEntries.length

  const passedNames = stages.filter(s => s.name.toLowerCase().includes('pass')).map(s => s.name)
  const closedNames = stages.filter(s =>
    s.name.toLowerCase().includes('closed') || s.name.toLowerCase().includes('invest')
  ).map(s => s.name)
  const ddNames = stages.filter(s =>
    s.name.toLowerCase().includes('due diligence') || s.name.toLowerCase().includes('diligence')
  ).map(s => s.name)

  const activeEntries = visibleEntries.filter(e => !passedNames.includes(e.status))
  const pipelineValue = activeEntries.reduce((sum, e) => sum + (e.fundraising_ask ?? 0), 0)
  const ddCount = visibleEntries.filter(e => ddNames.includes(e.status)).length
  const closedCount = visibleEntries.filter(e => closedNames.includes(e.status)).length
  const passedCount = visibleEntries.filter(e => passedNames.includes(e.status)).length
  const convDenom = closedCount + passedCount
  const convRate = convDenom > 0 ? `${Math.round((closedCount / convDenom) * 100)}%` : '—'

  const avgDays = visibleEntries.length > 0
    ? Math.round(visibleEntries.reduce((sum, e) =>
        sum + (Date.now() - new Date(e.created_at).getTime()) / 86_400_000, 0) / visibleEntries.length)
    : null

  const stats = [
    { label: 'Total Deals',      value: String(total) },
    { label: 'Pipeline Value',   value: pipelineValue > 0 ? fmtMoney(pipelineValue) : '—' },
    { label: 'Due Diligence',    value: String(ddCount) },
    { label: 'Avg Days Active',  value: avgDays != null ? `${avgDays}d` : '—' },
    { label: 'Conversion Rate',  value: convRate },
  ]

  return (
    <div className="grid grid-cols-5 gap-3 mb-5">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-lg border border-neutral-200 px-4 py-3 shadow-sm">
          <p className="text-xs text-neutral-500 font-medium mb-1">{s.label}</p>
          <p className="text-xl font-bold text-neutral-900">{s.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Markdown components for analysis report ───────────────────────────────

const reportComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-neutral-900 mb-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xs font-bold uppercase tracking-widest text-primary-500 mt-8 mb-4 pb-2 border-b border-primary-100">
      {String(children)}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-neutral-800 mt-6 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mt-4 mb-1.5">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-sm text-neutral-700 leading-relaxed mb-3">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-neutral-900">{children}</strong>
  ),
  ul: ({ children }) => <ul className="space-y-2 mb-4">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-2 mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => (
    <li className="flex gap-2 text-sm text-neutral-700 leading-relaxed">
      <span className="text-primary-400 mt-1 flex-shrink-0">•</span>
      <span>{children}</span>
    </li>
  ),
  hr: () => <hr className="border-neutral-100 my-6" />,
  code: ({ children }) => (
    <code className="font-mono text-xs bg-neutral-100 text-primary-600 px-1.5 py-0.5 rounded font-semibold">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary-300 pl-4 my-4 text-sm text-neutral-600 italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-6 rounded-lg border border-neutral-200">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-neutral-50">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2.5 text-left font-semibold text-neutral-600 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-neutral-200">
      {children}
    </th>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-neutral-100">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-neutral-50 transition-colors">{children}</tr>,
  td: ({ children }) => (
    <td className="px-3 py-2.5 text-neutral-700 align-top">{children}</td>
  ),
}

// ── Deck Analysis Modal (full-screen) ─────────────────────────────────────

function DeckAnalysisModal({
  entry,
  onClose,
}: {
  entry: PipelineEntry
  onClose: () => void
}) {
  const [content, setContent] = useState('')
  const [initializing, setInitializing] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!entry.deck_url) return
    const ac = new AbortController()

    async function run() {
      try {
        const res = await fetch('/api/pipeline/analyze-deck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deck_url: entry.deck_url,
            entry: {
              name: entry.name,
              sector: entry.sector,
              hq: entry.hq,
              stage: entry.stage,
              fundraising_ask: entry.fundraising_ask,
              status: entry.status,
            },
          }),
          signal: ac.signal,
        })

        // Non-200 responses return JSON errors
        if (!res.ok || res.headers.get('content-type')?.includes('application/json')) {
          const json = await res.json()
          setError(json.error ?? 'Analysis failed. Please try again.')
          setInitializing(false)
          return
        }

        if (!res.body) {
          setError('No response body received.')
          setInitializing(false)
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        setInitializing(false)
        setStreaming(true)

        while (true) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break
          setContent(prev => prev + decoder.decode(value, { stream: true }))
        }

        setStreaming(false)
        setDone(true)
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
        setInitializing(false)
        setStreaming(false)
      }
    }

    run()
    return () => ac.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.deck_url])

  async function handleDownload() {
    if (!content) return

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

    // Header
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, pageW, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(`Menomadin — Deck Analysis: ${entry.name}`, margin, 12)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(199, 210, 254)
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      pageW - margin, 21, { align: 'right' }
    )

    function checkPage(needed = 8) {
      if (y + needed > pageH - 15) { doc.addPage(); y = 15 }
    }

    function stripInline(text: string) {
      return text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    }

    function parseTableBlock(rows: string[]): { head: string[]; body: string[][] } | null {
      const dataRows = rows.filter(r => !r.match(/^\|[\s|:-]+\|$/))
      if (dataRows.length < 2) return null
      const head = dataRows[0].split('|').map(c => c.trim()).filter(Boolean)
      const body = dataRows.slice(1).map(r => r.split('|').map(c => c.trim()).filter(Boolean))
      return { head, body }
    }

    type Block =
      | { type: 'h1' | 'h2' | 'h3' | 'hr' | 'bullet' | 'text'; text: string }
      | { type: 'table'; rows: string[] }
      | { type: 'blank' }

    const blocks: Block[] = []
    const rawLines = content.split('\n')
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
      } else if (line.startsWith('# '))  { blocks.push({ type: 'h1', text: line.replace(/^# /, '') }); i++ }
      else if (line.startsWith('## '))   { blocks.push({ type: 'h2', text: line.replace(/^## /, '') }); i++ }
      else if (line.startsWith('### '))  { blocks.push({ type: 'h3', text: line.replace(/^### /, '') }); i++ }
      else if (line.startsWith('#### ')) { blocks.push({ type: 'h3', text: line.replace(/^#### /, '') }); i++ }
      else if (line.match(/^-{3,}$/))    { blocks.push({ type: 'hr', text: '' }); i++ }
      else if (line.match(/^[-*] /))     { blocks.push({ type: 'bullet', text: line.replace(/^[-*] /, '') }); i++ }
      else if (line.trim() !== '')       { blocks.push({ type: 'text', text: line }); i++ }
      else                               { blocks.push({ type: 'blank' }); i++ }
    }

    for (const block of blocks) {
      if (block.type === 'blank') {
        y += 2
      } else if (block.type === 'hr') {
        checkPage(6)
        doc.setDrawColor(220, 220, 235)
        doc.line(margin, y, pageW - margin, y)
        y += 5
      } else if (block.type === 'h1') {
        checkPage(12); y += 2
        doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 50)
        doc.text(stripInline(block.text), margin, y); y += 8
      } else if (block.type === 'h2') {
        checkPage(14); y += 4
        doc.setFillColor(238, 242, 255)
        doc.rect(margin - 2, y - 5, contentW + 4, 9, 'F')
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(79, 70, 229)
        doc.text(stripInline(block.text).toUpperCase(), margin, y); y += 8
      } else if (block.type === 'h3') {
        checkPage(10); y += 3
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 50)
        const wrapped = doc.splitTextToSize(stripInline(block.text), contentW)
        doc.text(wrapped, margin, y); y += wrapped.length * 5.5 + 1
      } else if (block.type === 'bullet') {
        const text = stripInline(block.text)
        const wrapped = doc.splitTextToSize(text, contentW - 8)
        checkPage(wrapped.length * 5 + 3)
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 70)
        doc.setFillColor(79, 70, 229)
        doc.circle(margin + 1.5, y - 1.5, 1, 'F')
        doc.text(wrapped, margin + 6, y); y += wrapped.length * 5 + 2
      } else if (block.type === 'text') {
        const text = stripInline(block.text)
        const wrapped = doc.splitTextToSize(text, contentW)
        checkPage(wrapped.length * 5 + 2)
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 70)
        doc.text(wrapped, margin, y); y += wrapped.length * 5 + 2
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
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 } },
          didDrawPage: () => { y = 15 },
        })
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
      }
    }

    doc.save(`menomadin-analysis-${entry.name.toLowerCase().replace(/\s+/g, '-')}.pdf`)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles size={14} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-neutral-900 truncate">
              Deck Analysis — {entry.name}
            </p>
            <p className="text-xs text-neutral-500">Menomadin Investment Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {done && content && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <Download size={12} /> Download PDF
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">

          {/* Initial loading state */}
          {initializing && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 size={28} className="text-primary-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-neutral-800">Analyzing deck…</p>
                <p className="text-xs text-neutral-500 mt-1">Downloading and reading the pitch deck</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 mt-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Analysis failed</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Streaming / completed report */}
          {content && (
            <ReactMarkdown components={reportComponents} remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          )}

          {/* Streaming cursor */}
          {streaming && content && (
            <span className="inline-block w-2 h-4 bg-primary-500 rounded-sm animate-pulse ml-0.5" />
          )}

          {/* Done state — show download prompt */}
          {done && content && (
            <div className="mt-10 pt-6 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-xs text-neutral-400">Analysis complete · Powered by Menomadin Deck Analyst</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              >
                <Download size={12} /> Save as PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Deal Panel (slide-over) ───────────────────────────────────────────────

function DealPanel({
  entry,
  onClose,
  onEdit,
  onDelete,
}: {
  entry: PipelineEntry
  onClose: () => void
  onEdit: (e: PipelineEntry) => void
  onDelete: (id: string, name: string) => void
}) {
  const [tab, setTab] = useState<'details' | 'tasks'>('details')
  const [showAnalysis, setShowAnalysis] = useState(false)

  const createdDate = new Date(entry.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  const detailRows = [
    { label: 'Geography / HQ',  value: entry.hq },
    { label: 'Lead Partner',    value: entry.lead_partner },
    { label: 'Source',          value: entry.source },
    { label: 'Round Stage',     value: entry.stage || null },
    { label: 'Pipeline Stage',  value: entry.status },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-200">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-lg font-bold text-neutral-900">{entry.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {entry.sector && <span className="text-xs text-neutral-600">{entry.sector}</span>}
              {entry.hq && (
                <>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="text-xs text-neutral-600">{entry.hq}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50/60 px-6">
          <button
            onClick={() => setTab('details')}
            className={`py-3 px-4 text-xs font-semibold transition-all ${
              tab === 'details'
                ? 'text-primary-500 border-b-2 border-primary-500 -mb-px bg-white'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setTab('tasks')}
            className={`py-3 px-4 text-xs font-semibold transition-all ${
              tab === 'tasks'
                ? 'text-primary-500 border-b-2 border-primary-500 -mb-px bg-white'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Tasks
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {tab === 'details' && (
            <>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500 font-medium mb-0.5">Fundraising Ask</p>
              <p className="text-lg font-bold text-neutral-900">
                {entry.fundraising_ask ? fmtMoney(entry.fundraising_ask) : '—'}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500 font-medium mb-1">Internal Score</p>
              {entry.internal_score ? (
                <StarRow score={entry.internal_score} size={16} />
              ) : (
                <p className="text-sm text-neutral-500">Not rated</p>
              )}
            </div>
          </div>

          {/* Detail rows */}
          {detailRows.map(({ label, value }) => value ? (
            <div key={label}>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-sm text-slate-800">{value}</p>
            </div>
          ) : null)}

          {entry.next_steps && (
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Next Steps</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{entry.next_steps}</p>
            </div>
          )}

          {entry.notes && (
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}

          {entry.deck_url && (
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Pitch Deck</p>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={entry.deck_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 hover:underline"
                >
                  <Paperclip size={13} /> View deck
                </a>
                <button
                  onClick={() => setShowAnalysis(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors"
                >
                  <Sparkles size={11} /> Full Analysis
                </button>
              </div>
            </div>
          )}

          {showAnalysis && entry.deck_url && (
            <DeckAnalysisModal entry={entry} onClose={() => setShowAnalysis(false)} />
          )}

          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Added</p>
            <p className="text-sm text-neutral-600">{createdDate}</p>
          </div>

            </>
          )}

          {tab === 'tasks' && (
            <DealTasks dealId={entry.id} dealName={entry.name} />
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-neutral-200 flex gap-3">
          <button
            onClick={() => { onClose(); onEdit(entry) }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            <Pencil size={14} /> Edit deal
          </button>
          <button
            onClick={() => { onClose(); onDelete(entry.id, entry.name) }}
            className="px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </>
  )
}

// ── Draggable Card ────────────────────────────────────────────────────────

function DealCard({
  entry,
  isDragging,
  onView,
  onEdit,
  onDelete,
}: {
  entry: PipelineEntry
  isDragging?: boolean
  onView: (e: PipelineEntry) => void
  onEdit: (e: PipelineEntry) => void
  onDelete: (id: string, name: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: entry.id })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  const askLabel = fmtAsk(entry.fundraising_ask)

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onView(entry)}
      className={`bg-white rounded-lg border border-neutral-200 p-3 shadow-sm dark:shadow-md group cursor-pointer transition-shadow ${
        isDragging ? 'opacity-40' : 'hover:shadow-sm dark:shadow-md-hover hover:border-violet-200'
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          {...attributes}
          onClick={e => e.stopPropagation()}
          className="mt-0.5 text-slate-300 hover:text-neutral-600 flex-shrink-0 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 truncate">{entry.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {entry.sector && <p className="text-xs text-neutral-500">{entry.sector}</p>}
            {entry.hq && (
              <>
                <span className="text-slate-200 text-xs">·</span>
                <p className="text-xs text-neutral-500">{entry.hq}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {entry.stage && (
              <span className="text-xs bg-neutral-100 text-neutral-700 rounded-lg px-2 py-0.5">{entry.stage}</span>
            )}
            {askLabel && (
              <span className="text-xs bg-gold-50 text-primary-500 rounded-lg px-2 py-0.5">{askLabel}</span>
            )}
          </div>
          {entry.internal_score != null && entry.internal_score > 0 && (
            <div className="mt-1.5">
              <StarRow score={entry.internal_score} size={11} />
            </div>
          )}
        </div>

        <div
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => onEdit(entry)}
            className="p-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(entry.id, entry.name)}
            className="p-1 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Droppable Column ──────────────────────────────────────────────────────

function Column({
  stage,
  entries,
  activeId,
  onAddCard,
  onViewCard,
  onEditCard,
  onDeleteCard,
  onEditStage,
  onDeleteStage,
}: {
  stage: Stage
  entries: PipelineEntry[]
  activeId: string | null
  onAddCard: (stageName: string) => void
  onViewCard: (e: PipelineEntry) => void
  onEditCard: (e: PipelineEntry) => void
  onDeleteCard: (id: string, name: string) => void
  onEditStage: (s: Stage) => void
  onDeleteStage: (s: Stage) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.name })
  const [showMenu, setShowMenu] = useState(false)
  const headerClass = COLOR_HEADER[stage.color] ?? COLOR_HEADER.slate
  const dotClass    = COLOR_DOT[stage.color]    ?? COLOR_DOT.slate

  return (
    <div className="flex-shrink-0 w-64 flex flex-col">
      <div className={`rounded-lg border px-3 py-2.5 mb-2 flex items-center justify-between ${headerClass}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
          <span className="text-sm font-semibold truncate">{stage.name}</span>
          <span className="text-xs opacity-50 font-normal">{entries.length}</span>
        </div>
        <div className="relative flex items-center gap-0.5">
          <button
            onClick={() => onAddCard(stage.name)}
            className="p-1 rounded-lg hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
            title="Add deal"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="p-1 rounded-lg hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-xl ring-1 ring-black/[0.06] py-1 w-36"
              onMouseLeave={() => setShowMenu(false)}
            >
              <button
                onClick={() => { onEditStage(stage); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-800 hover:bg-neutral-50"
              >
                <Pencil size={12} /> Edit stage
              </button>
              <button
                onClick={() => { onDeleteStage(stage); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
              >
                <Trash2 size={12} /> Delete stage
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 min-h-24 rounded-lg p-1.5 transition-colors ${
          isOver ? 'bg-gold-50 ring-2 ring-violet-200 ring-dashed' : ''
        }`}
      >
        {entries.map(entry => (
          <DealCard
            key={entry.id}
            entry={entry}
            isDragging={activeId === entry.id}
            onView={onViewCard}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
          />
        ))}

        {entries.length === 0 && !isOver && (
          <button
            onClick={() => onAddCard(stage.name)}
            className="flex items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed border-neutral-200 text-xs text-neutral-500 hover:border-gold-200 hover:text-primary-500 transition-colors"
          >
            <Plus size={12} /> Add deal
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Board ────────────────────────────────────────────────────────────

export default function PipelineBoard({ stages, entries }: { stages: Stage[]; entries: PipelineEntry[] }) {
  const router = useRouter()
  const [view, setView] = useState<'board' | 'analytics'>('board')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localEntries, setLocalEntries] = useState(entries)

  const [panelEntry, setPanelEntry] = useState<PipelineEntry | null>(null)
  const [addCardStage, setAddCardStage] = useState<string | null>(null)
  const [editCard, setEditCard] = useState<PipelineEntry | null>(null)
  const [showAddStage, setShowAddStage] = useState(false)
  const [editStage, setEditStage] = useState<Stage | null>(null)
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const visibleEntries = !q ? localEntries : localEntries.filter(e =>
    e.name.toLowerCase().includes(q) ||
    (e.sector ?? '').toLowerCase().includes(q) ||
    (e.stage ?? '').toLowerCase().includes(q) ||
    (e.notes ?? '').toLowerCase().includes(q) ||
    (e.lead_partner ?? '').toLowerCase().includes(q)
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeEntry = activeId ? localEntries.find(e => e.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const cardId    = String(active.id)
    const newStatus = String(over.id)

    setLocalEntries(prev =>
      prev.map(e => e.id === cardId ? { ...e, status: newStatus } : e)
    )

    await movePipelineCard(cardId, newStatus)
    router.refresh()
  }

  const handleDeleteCard = useCallback(async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from pipeline?`)) return
    setPanelEntry(null)
    setLocalEntries(prev => prev.filter(e => e.id !== id))
    await deletePipelineEntry(id)
    router.refresh()
  }, [router])

  const handleDeleteStage = useCallback(async (stage: Stage) => {
    if (!confirm(`Delete stage "${stage.name}"? Cards in this stage will be moved to uncategorised.`)) return
    await deleteStage(stage.id, stage.name)
    router.refresh()
  }, [router])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Deal Pipeline</h1>
        <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setView('board')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${view === 'board' ? 'bg-primary-500 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-800'}`}
          >
            <Plus size={12} /> Board
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${view === 'analytics' ? 'bg-primary-500 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-800'}`}
          >
            <BarChart2 size={12} /> Analytics
          </button>
        </div>
        {view === 'board' && <>
          <Button onClick={() => setAddCardStage(stages[0]?.name ?? '')} size="sm">
            <Plus size={14} /> Add deal
          </Button>
          <Button onClick={() => setShowAddStage(true)} variant="secondary" size="sm">
            <Plus size={14} /> Add stage
          </Button>
        </>}
      </div>

      {view === 'analytics' ? (
        <PipelineAnalytics entries={localEntries} stages={stages} />
      ) : (
      <>
      <AnalyticsBar entries={localEntries} stages={stages} />

      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search deals by name, sector, stage, notes…"
          className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 px-1 -mx-1">
          {stages.map(stage => (
            <Column
              key={stage.id}
              stage={stage}
              entries={visibleEntries.filter(e => e.status === stage.name)}
              activeId={activeId}
              onAddCard={(stageName) => setAddCardStage(stageName)}
              onViewCard={setPanelEntry}
              onEditCard={setEditCard}
              onDeleteCard={handleDeleteCard}
              onEditStage={setEditStage}
              onDeleteStage={handleDeleteStage}
            />
          ))}

          <div className="flex-shrink-0 w-64">
            <button
              onClick={() => setShowAddStage(true)}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-200 text-sm text-neutral-500 hover:border-gold-200 hover:text-primary-500 transition-colors"
            >
              <Plus size={15} /> Add stage
            </button>
          </div>
        </div>

        <DragOverlay>
          {activeEntry && (
            <div className="bg-white rounded-lg border border-gold-200 shadow-xl p-3 w-64 rotate-2 opacity-95">
              <p className="text-sm font-semibold text-neutral-900">{activeEntry.name}</p>
              {activeEntry.sector && (
                <p className="text-xs text-neutral-500 mt-0.5">{activeEntry.sector}</p>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Slide-over panel */}
      {panelEntry && (
        <DealPanel
          entry={panelEntry}
          onClose={() => setPanelEntry(null)}
          onEdit={(e) => { setPanelEntry(null); setEditCard(e) }}
          onDelete={handleDeleteCard}
        />
      )}
      </>
      )}

      <Modal
        open={!!addCardStage}
        onClose={() => setAddCardStage(null)}
        title={`Add deal${addCardStage ? ` — ${addCardStage}` : ''}`}
      >
        <PipelineForm
          defaultStatus={addCardStage ?? undefined}
          stageNames={stages.map(s => s.name)}
          onClose={() => setAddCardStage(null)}
        />
      </Modal>

      <Modal open={!!editCard} onClose={() => setEditCard(null)} title="Edit deal">
        {editCard && (
          <PipelineForm
            entry={editCard}
            stageNames={stages.map(s => s.name)}
            onClose={() => setEditCard(null)}
          />
        )}
      </Modal>

      <Modal open={showAddStage} onClose={() => setShowAddStage(false)} title="Add stage">
        <StageForm nextPosition={stages.length} onClose={() => setShowAddStage(false)} />
      </Modal>

      <Modal open={!!editStage} onClose={() => setEditStage(null)} title="Edit stage">
        {editStage && (
          <StageForm stage={editStage} onClose={() => setEditStage(null)} />
        )}
      </Modal>
    </div>
  )
}
