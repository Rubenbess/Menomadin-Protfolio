'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Check, Bell, AlertCircle, Clock, CalendarDays } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ReminderForm from '@/components/forms/ReminderForm'
import { toggleReminder, deleteReminder } from '@/actions/reminders'
import type { Reminder, Company } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Follow-up':        'bg-violet-100 text-violet-700',
  'Board Meeting':    'bg-blue-100 text-blue-700',
  'Report Due':       'bg-amber-100 text-amber-700',
  'KPI Review':       'bg-emerald-100 text-emerald-700',
  'Contract Renewal': 'bg-orange-100 text-orange-700',
  'Call':             'bg-cyan-100 text-cyan-700',
  'Other':            'bg-slate-100 text-slate-700',
}

type Status = 'overdue' | 'today' | 'upcoming' | 'completed'
type Filter  = 'all' | Status

function getStatus(r: Reminder): Status {
  if (r.completed) return 'completed'
  const today   = new Date().toISOString().split('T')[0]
  const dueDate = r.due_date
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  return 'upcoming'
}

function fmtDue(due: string): string {
  const today    = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
  if (due === today)    return 'Today'
  if (due === tomorrow) return 'Tomorrow'
  return new Date(due + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function daysUntil(due: string): number {
  const today = new Date().toISOString().split('T')[0]
  const d1 = new Date(today + 'T00:00:00').getTime()
  const d2 = new Date(due  + 'T00:00:00').getTime()
  return Math.round((d2 - d1) / 86_400_000)
}

// ── Reminder row ──────────────────────────────────────────────────────────────

function ReminderRow({
  reminder,
  companyName,
  status,
  onToggle,
  onEdit,
  onDelete,
}: {
  reminder: Reminder
  companyName: string | null
  status: Status
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const days = daysUntil(reminder.due_date)

  const dueBadge = status === 'overdue'   ? `bg-red-100 text-red-700`
                 : status === 'today'     ? `bg-amber-100 text-amber-700`
                 : status === 'completed' ? `bg-slate-100 text-slate-400`
                 : `bg-blue-50 text-blue-600`

  const dotColor = status === 'overdue'   ? 'bg-red-400'
                 : status === 'today'     ? 'bg-amber-400'
                 : status === 'completed' ? 'bg-slate-200'
                 : 'bg-blue-400'

  return (
    <div className={`flex items-start gap-4 px-5 py-4 group hover:bg-slate-50/60 transition-colors ${reminder.completed ? 'opacity-60' : ''}`}>
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />

      {/* Complete toggle */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 ${
          reminder.completed
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-300 hover:border-violet-400'
        }`}
      >
        {reminder.completed && <Check size={10} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <p className={`text-sm font-semibold ${reminder.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {reminder.title}
          </p>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[reminder.category] ?? 'bg-slate-100 text-slate-600'}`}>
            {reminder.category}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {companyName && (
            <span className="text-xs text-violet-600 font-medium">{companyName}</span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${dueBadge}`}>
            {status === 'overdue'
              ? `${Math.abs(days)}d overdue`
              : fmtDue(reminder.due_date)}
          </span>
        </div>

        {reminder.notes && (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{reminder.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'overdue',   label: 'Overdue' },
  { value: 'today',     label: 'Today' },
  { value: 'upcoming',  label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
]

export default function RemindersClient({
  reminders: initialReminders,
  companies,
}: {
  reminders: Reminder[]
  companies: Pick<Company, 'id' | 'name'>[]
}) {
  const router = useRouter()
  const [reminders, setReminders] = useState(initialReminders)
  const [filter, setFilter]       = useState<Filter>('all')
  const [showAdd, setShowAdd]     = useState(false)
  const [editReminder, setEditReminder] = useState<Reminder | null>(null)

  const companyName = (id: string | null) =>
    id ? (companies.find(c => c.id === id)?.name ?? null) : null

  const withStatus = useMemo(() =>
    reminders.map(r => ({ ...r, status: getStatus(r) })),
    [reminders]
  )

  const counts = useMemo(() => ({
    overdue:   withStatus.filter(r => r.status === 'overdue').length,
    today:     withStatus.filter(r => r.status === 'today').length,
    upcoming:  withStatus.filter(r => r.status === 'upcoming').length,
    completed: withStatus.filter(r => r.status === 'completed').length,
  }), [withStatus])

  const filtered = useMemo(() =>
    filter === 'all'
      ? withStatus.filter(r => r.status !== 'completed')
      : withStatus.filter(r => r.status === filter),
    [withStatus, filter]
  )

  async function handleToggle(id: string, current: boolean) {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !current } : r))
    await toggleReminder(id, !current)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this reminder?')) return
    setReminders(prev => prev.filter(r => r.id !== id))
    await deleteReminder(id)
    router.refresh()
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reminders</h1>
          <p className="text-sm text-slate-400 mt-0.5">Deadlines, follow-ups and tasks</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Reminder
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Overdue',   count: counts.overdue,   color: 'text-red-600',     bg: 'bg-red-50   border-red-200',   icon: <AlertCircle size={14} className="text-red-400" /> },
          { label: 'Today',     count: counts.today,     color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200', icon: <Bell size={14} className="text-amber-400" /> },
          { label: 'Upcoming',  count: counts.upcoming,  color: 'text-blue-600',    bg: 'bg-blue-50  border-blue-200',  icon: <Clock size={14} className="text-blue-400" /> },
          { label: 'Completed', count: counts.completed, color: 'text-emerald-600', bg: 'bg-white    border-slate-200', icon: <Check size={14} className="text-emerald-400" /> },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
            <div className="flex items-center gap-1.5 mb-1">{s.icon}<p className="text-xs text-slate-500 font-medium">{s.label}</p></div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-card ring-1 ring-black/[0.04] w-fit">
        {FILTERS.map(({ value, label }) => {
          const count = value === 'all'
            ? counts.overdue + counts.today + counts.upcoming
            : counts[value as keyof typeof counts]
          return (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === value
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                  filter === value
                    ? 'bg-white/20 text-white'
                    : value === 'overdue' ? 'bg-red-100 text-red-600'
                    : value === 'today'   ? 'bg-amber-100 text-amber-600'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] px-5 py-16 text-center">
          <CalendarDays size={24} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-4">
            {filter === 'all' ? 'No active reminders.' : `No ${filter} reminders.`}
          </p>
          <Button onClick={() => setShowAdd(true)} variant="secondary">
            <Plus size={14} /> Add reminder
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] overflow-hidden divide-y divide-slate-50">
          {filtered.map(r => (
            <ReminderRow
              key={r.id}
              reminder={r}
              companyName={companyName(r.company_id)}
              status={r.status}
              onToggle={() => handleToggle(r.id, r.completed)}
              onEdit={() => setEditReminder(r)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Reminder">
        <ReminderForm companies={companies} onClose={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editReminder} onClose={() => setEditReminder(null)} title="Edit Reminder">
        {editReminder && (
          <ReminderForm
            reminder={editReminder}
            companies={companies}
            onClose={() => setEditReminder(null)}
          />
        )}
      </Modal>
    </div>
  )
}
