'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { Plus, Pencil, Trash2, GripVertical, MoreHorizontal, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import PipelineForm from '@/components/forms/PipelineForm'
import StageForm from '@/components/forms/StageForm'
import { movePipelineCard, deleteStage } from '@/actions/pipeline-stages'
import { deletePipelineEntry } from '@/actions/pipeline'
import type { PipelineEntry } from '@/lib/types'

// ── Color maps ────────────────────────────────────────────────────────────

const COLOR_HEADER: Record<string, string> = {
  slate:  'bg-slate-100 text-slate-700 border-slate-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  indigo: 'bg-violet-100 text-violet-700 border-violet-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  amber:  'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  green:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  red:    'bg-red-100 text-red-700 border-red-200',
}

const COLOR_DOT: Record<string, string> = {
  slate:  'bg-slate-400',
  blue:   'bg-blue-500',
  indigo: 'bg-violet-500',
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
        <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-400 font-medium mb-1">{s.label}</p>
          <p className="text-xl font-bold text-slate-900">{s.value}</p>
        </div>
      ))}
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
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-lg font-bold text-slate-900">{entry.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {entry.sector && <span className="text-xs text-slate-500">{entry.sector}</span>}
              {entry.hq && (
                <>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="text-xs text-slate-500">{entry.hq}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-medium mb-0.5">Fundraising Ask</p>
              <p className="text-lg font-bold text-slate-900">
                {entry.fundraising_ask ? fmtMoney(entry.fundraising_ask) : '—'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-medium mb-1">Internal Score</p>
              {entry.internal_score ? (
                <StarRow score={entry.internal_score} size={16} />
              ) : (
                <p className="text-sm text-slate-400">Not rated</p>
              )}
            </div>
          </div>

          {/* Detail rows */}
          {detailRows.map(({ label, value }) => value ? (
            <div key={label}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-sm text-slate-800">{value}</p>
            </div>
          ) : null)}

          {entry.next_steps && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Next Steps</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{entry.next_steps}</p>
            </div>
          )}

          {entry.notes && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Added</p>
            <p className="text-sm text-slate-500">{createdDate}</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={() => { onClose(); onEdit(entry) }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            <Pencil size={14} /> Edit deal
          </button>
          <button
            onClick={() => { onClose(); onDelete(entry.id, entry.name) }}
            className="px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
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
      className={`bg-white rounded-xl border border-slate-200 p-3 shadow-card group cursor-pointer transition-shadow ${
        isDragging ? 'opacity-40' : 'hover:shadow-card-hover hover:border-violet-200'
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          {...attributes}
          onClick={e => e.stopPropagation()}
          className="mt-0.5 text-slate-300 hover:text-slate-500 flex-shrink-0 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{entry.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {entry.sector && <p className="text-xs text-slate-400">{entry.sector}</p>}
            {entry.hq && (
              <>
                <span className="text-slate-200 text-xs">·</span>
                <p className="text-xs text-slate-400">{entry.hq}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {entry.stage && (
              <span className="text-xs bg-slate-100 text-slate-600 rounded-lg px-2 py-0.5">{entry.stage}</span>
            )}
            {askLabel && (
              <span className="text-xs bg-violet-50 text-violet-600 rounded-lg px-2 py-0.5">{askLabel}</span>
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
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(entry.id, entry.name)}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
      <div className={`rounded-xl border px-3 py-2.5 mb-2 flex items-center justify-between ${headerClass}`}>
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
              className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-xl ring-1 ring-black/[0.06] py-1 w-36"
              onMouseLeave={() => setShowMenu(false)}
            >
              <button
                onClick={() => { onEditStage(stage); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
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
        className={`flex-1 flex flex-col gap-2 min-h-24 rounded-xl p-1.5 transition-colors ${
          isOver ? 'bg-violet-50 ring-2 ring-violet-200 ring-dashed' : ''
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
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-400 hover:border-violet-300 hover:text-violet-500 transition-colors"
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
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localEntries, setLocalEntries] = useState(entries)

  const [panelEntry, setPanelEntry] = useState<PipelineEntry | null>(null)
  const [addCardStage, setAddCardStage] = useState<string | null>(null)
  const [editCard, setEditCard] = useState<PipelineEntry | null>(null)
  const [showAddStage, setShowAddStage] = useState(false)
  const [editStage, setEditStage] = useState<Stage | null>(null)

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
        <Button onClick={() => setAddCardStage(stages[0]?.name ?? '')} size="sm">
          <Plus size={14} /> Add deal
        </Button>
        <Button onClick={() => setShowAddStage(true)} variant="secondary" size="sm">
          <Plus size={14} /> Add stage
        </Button>
      </div>

      <AnalyticsBar entries={localEntries} stages={stages} />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 px-1 -mx-1">
          {stages.map(stage => (
            <Column
              key={stage.id}
              stage={stage}
              entries={localEntries.filter(e => e.status === stage.name)}
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
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-violet-300 hover:text-violet-500 transition-colors"
            >
              <Plus size={15} /> Add stage
            </button>
          </div>
        </div>

        <DragOverlay>
          {activeEntry && (
            <div className="bg-white rounded-xl border border-violet-300 shadow-xl p-3 w-64 rotate-2 opacity-95">
              <p className="text-sm font-semibold text-slate-900">{activeEntry.name}</p>
              {activeEntry.sector && (
                <p className="text-xs text-slate-400 mt-0.5">{activeEntry.sector}</p>
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
