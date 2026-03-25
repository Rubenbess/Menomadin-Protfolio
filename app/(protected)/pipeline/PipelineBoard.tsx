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
import { Plus, Pencil, Trash2, GripVertical, MoreHorizontal } from 'lucide-react'
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

// ── Draggable Card ────────────────────────────────────────────────────────

function DealCard({
  entry,
  isDragging,
  onEdit,
  onDelete,
}: {
  entry: PipelineEntry
  isDragging?: boolean
  onEdit: (e: PipelineEntry) => void
  onDelete: (id: string, name: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: entry.id })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-slate-200 p-3 shadow-card group cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? 'opacity-40' : 'hover:shadow-card-hover hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          {...attributes}
          className="mt-0.5 text-slate-300 hover:text-slate-500 flex-shrink-0 cursor-grab transition-colors"
        >
          <GripVertical size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{entry.name}</p>
          {entry.sector && (
            <p className="text-xs text-slate-400 mt-0.5">{entry.sector}</p>
          )}
          {entry.stage && (
            <span className="inline-block mt-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg px-2 py-0.5">
              {entry.stage}
            </span>
          )}
          {entry.notes && (
            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{entry.notes}</p>
          )}
        </div>
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
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
  onEditCard,
  onDeleteCard,
  onEditStage,
  onDeleteStage,
}: {
  stage: Stage
  entries: PipelineEntry[]
  activeId: string | null
  onAddCard: (stageName: string) => void
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
      {/* Column header */}
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

      {/* Cards drop zone */}
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
      prev.map(e => (e.id === cardId ? { ...e, status: newStatus as PipelineEntry['status'] } : e))
    )

    await movePipelineCard(cardId, newStatus)
    router.refresh()
  }

  const handleDeleteCard = useCallback(async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from pipeline?`)) return
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
        <Button onClick={() => setShowAddStage(true)} variant="secondary" size="sm">
          <Plus size={14} /> Add stage
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 px-1 -mx-1">
          {stages.map(stage => (
            <Column
              key={stage.id}
              stage={stage}
              entries={localEntries.filter(e => e.status === stage.name)}
              activeId={activeId}
              onAddCard={(stageName) => setAddCardStage(stageName)}
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
