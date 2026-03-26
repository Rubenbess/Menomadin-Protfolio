'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutGrid,
  List,
  Plus,
  Users,
  Search,
  Pencil,
  Trash2,
  Calendar,
  X,
  Check,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import TaskForm from '@/components/forms/TaskForm'
import { deleteTask } from '@/actions/tasks'
import {
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '@/actions/team-members'
import { TaskWithRelations, TaskStatus, TaskPriority, TeamMember } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string
  name: string
}

interface TasksClientProps {
  tasks: TaskWithRelations[]
  companies: Company[]
  teamMembers: TeamMember[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES: { key: TaskStatus; label: string; accent: string; bg: string; text: string }[] = [
  {
    key: 'not-started',
    label: 'Not Started',
    accent: 'border-slate-300',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    accent: 'border-blue-400',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
  },
  {
    key: 'waiting',
    label: 'Waiting',
    accent: 'border-amber-400',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
  {
    key: 'done',
    label: 'Done',
    accent: 'border-emerald-400',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
  },
]

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  low: 'bg-slate-100 text-slate-500',
}

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false
  const today = new Date().toISOString().split('T')[0]
  return dateStr < today
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUSES.find(x => x.key === status)!
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

function AssigneeAvatar({
  member,
}: {
  member: { name: string; color: string } | null
}) {
  if (!member) return null
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold flex-shrink-0"
      style={{ backgroundColor: member.color }}
      title={member.name}
    >
      {getInitials(member.name)}
    </span>
  )
}

// ─── Task Card (Board view) ───────────────────────────────────────────────────

function TaskCard({
  task,
  onClick,
  onDelete,
}: {
  task: TaskWithRelations
  onClick: () => void
  onDelete: () => void
}) {
  const overdue = isOverdue(task.due_date)
  const dateLabel = formatDate(task.due_date)

  return (
    <div
      className="bg-white rounded-xl shadow-sm ring-1 ring-black/[0.04] p-3.5 cursor-pointer hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 leading-snug flex-1 min-w-0">
          {task.title}
        </p>
        <button
          onClick={e => {
            e.stopPropagation()
            onDelete()
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <PriorityBadge priority={task.priority} />
        {task.companies && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-600 border border-violet-100">
            {task.companies.name}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        {dateLabel ? (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${
              overdue ? 'text-red-500' : 'text-slate-400'
            }`}
          >
            <Calendar size={11} />
            {dateLabel}
          </span>
        ) : (
          <span />
        )}
        <AssigneeAvatar member={task.team_members} />
      </div>
    </div>
  )
}

// ─── Team Members Modal ───────────────────────────────────────────────────────

function TeamMembersModal({
  open,
  onClose,
  teamMembers,
  onRefresh,
}: {
  open: boolean
  onClose: () => void
  teamMembers: TeamMember[]
  onRefresh: () => void
}) {
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function startEdit(member: TeamMember) {
    setEditingId(member.id)
    setEditName(member.name)
    setEditRole(member.role ?? '')
    setEditColor(member.color)
    setEditError(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAddLoading(true)
    setAddError(null)
    const result = await createTeamMember({
      name: newName.trim(),
      role: newRole.trim() || null,
      color: newColor,
    })
    setAddLoading(false)
    if (result.error) {
      setAddError(result.error)
      return
    }
    setNewName('')
    setNewRole('')
    setNewColor(PRESET_COLORS[0])
    onRefresh()
  }

  async function handleEditSave(id: string) {
    if (!editName.trim()) return
    setEditLoading(true)
    setEditError(null)
    const result = await updateTeamMember(id, {
      name: editName.trim(),
      role: editRole.trim() || null,
      color: editColor,
    })
    setEditLoading(false)
    if (result.error) {
      setEditError(result.error)
      return
    }
    setEditingId(null)
    onRefresh()
  }

  async function handleDelete(id: string) {
    await deleteTeamMember(id)
    setDeleteConfirmId(null)
    onRefresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Team Members">
      <div className="space-y-3">
        {teamMembers.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No team members yet.</p>
        )}

        {teamMembers.map(member => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 ring-1 ring-black/[0.04]"
          >
            {editingId === member.id ? (
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="field-input flex-1"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    className="field-input flex-1"
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    placeholder="Role (optional)"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditColor(color)}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor: editColor === color ? '#1e293b' : 'transparent',
                        transform: editColor === color ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                {editError && <p className="text-xs text-red-500">{editError}</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditSave(member.id)}
                    disabled={editLoading}
                  >
                    <Check size={13} />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : deleteConfirmId === member.id ? (
              <div className="flex-1">
                <p className="text-sm text-slate-700 mb-2">
                  Delete <strong>{member.name}</strong>? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(member.id)}
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {getInitials(member.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{member.name}</p>
                  {member.role && (
                    <p className="text-xs text-slate-400 truncate">{member.role}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(member)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(member.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add new member form */}
        <form
          onSubmit={handleAdd}
          className="pt-3 border-t border-slate-100 space-y-2"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Add Member
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              className="field-input flex-1"
              placeholder="Name *"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
            <input
              type="text"
              className="field-input flex-1"
              placeholder="Role (optional)"
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setNewColor(color)}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: color,
                  borderColor: newColor === color ? '#1e293b' : 'transparent',
                  transform: newColor === color ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <Button type="submit" size="sm" disabled={addLoading}>
            <Plus size={14} />
            {addLoading ? 'Adding...' : 'Add Member'}
          </Button>
        </form>
      </div>
    </Modal>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TasksClient({ tasks, companies, teamMembers }: TasksClientProps) {
  const router = useRouter()
  const [view, setView] = useState<'board' | 'list'>('board')

  // Filters
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<'all' | TaskPriority>('all')
  const [filterAssignee, setFilterAssignee] = useState<'all' | string>('all')

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('not-started')
  const [teamModalOpen, setTeamModalOpen] = useState(false)

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function openAddTask(status: TaskStatus = 'not-started') {
    setEditingTask(null)
    setDefaultStatus(status)
    setTaskModalOpen(true)
  }

  function openEditTask(task: TaskWithRelations) {
    setEditingTask(task)
    setDefaultStatus(task.status)
    setTaskModalOpen(true)
  }

  function closeTaskModal() {
    setTaskModalOpen(false)
    setEditingTask(null)
  }

  async function handleDeleteTask(id: string) {
    await deleteTask(id)
    setDeleteConfirmId(null)
    router.refresh()
  }

  function handleSuccess() {
    router.refresh()
  }

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchSearch =
        !search ||
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.description ?? '').toLowerCase().includes(search.toLowerCase())
      const matchPriority = filterPriority === 'all' || task.priority === filterPriority
      const matchAssignee =
        filterAssignee === 'all' ||
        (filterAssignee === '' ? !task.assignee_id : task.assignee_id === filterAssignee)
      return matchSearch && matchPriority && matchAssignee
    })
  }, [tasks, search, filterPriority, filterAssignee])

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskWithRelations[]> = {
      'not-started': [],
      'in-progress': [],
      waiting: [],
      done: [],
    }
    for (const task of filteredTasks) {
      map[task.status].push(task)
    }
    return map
  }, [filteredTasks])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-100 bg-white">
        <div className="page-header mb-4">
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setTeamModalOpen(true)}>
              <Users size={14} />
              Team
            </Button>
            <Button size="sm" onClick={() => openAddTask()}>
              <Plus size={14} />
              Add Task
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              className="field-input pl-8 py-2"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Priority filter */}
          <select
            className="field-select py-2 w-auto min-w-[120px]"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as 'all' | TaskPriority)}
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Assignee filter */}
          <select
            className="field-select py-2 w-auto min-w-[140px]"
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
          >
            <option value="all">All assignees</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1 ml-auto">
            <button
              onClick={() => setView('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'board'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={14} />
              Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={14} />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {view === 'board' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {STATUSES.map(statusDef => {
              const columnTasks = tasksByStatus[statusDef.key]
              return (
                <div
                  key={statusDef.key}
                  className={`bg-slate-50/60 rounded-2xl p-3 flex flex-col gap-2 min-h-[200px] border-t-2 ${statusDef.accent}`}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-1 py-0.5 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${statusDef.text}`}
                      >
                        {statusDef.label}
                      </span>
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${statusDef.bg} ${statusDef.text}`}
                      >
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Task cards */}
                  {columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => openEditTask(task)}
                      onDelete={() => setDeleteConfirmId(task.id)}
                    />
                  ))}

                  {/* Quick add button */}
                  <button
                    onClick={() => openAddTask(statusDef.key)}
                    className="mt-auto flex items-center gap-1.5 w-full px-2 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-all"
                  >
                    <Plus size={13} />
                    Add task
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          /* List view */
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Company</th>
                  <th>Assignee</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-400 py-8">
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(task => {
                    const overdue = isOverdue(task.due_date)
                    const dateLabel = formatDate(task.due_date)
                    return (
                      <tr key={task.id}>
                        <td>
                          <button
                            className="text-sm font-medium text-slate-800 hover:text-violet-600 transition-colors text-left"
                            onClick={() => openEditTask(task)}
                          >
                            {task.title}
                          </button>
                          {task.description && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={task.status} />
                        </td>
                        <td>
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td>
                          {dateLabel ? (
                            <span
                              className={`text-sm font-medium ${
                                overdue ? 'text-red-500' : 'text-slate-600'
                              }`}
                            >
                              {dateLabel}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td>
                          {task.companies ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-600 border border-violet-100">
                              {task.companies.name}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td>
                          {task.team_members ? (
                            <div className="flex items-center gap-2">
                              <AssigneeAvatar member={task.team_members} />
                              <span className="text-sm text-slate-600">
                                {task.team_members.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openEditTask(task)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(task.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task create/edit modal */}
      <Modal
        open={taskModalOpen}
        onClose={closeTaskModal}
        title={editingTask ? 'Edit Task' : 'New Task'}
      >
        <TaskForm
          task={editingTask}
          companies={companies}
          teamMembers={teamMembers}
          defaultStatus={defaultStatus}
          onClose={closeTaskModal}
          onSuccess={handleSuccess}
        />
      </Modal>

      {/* Team members modal */}
      <TeamMembersModal
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        teamMembers={teamMembers}
        onRefresh={() => router.refresh()}
      />

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Task"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this task? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => deleteConfirmId && handleDeleteTask(deleteConfirmId)}
            >
              Delete Task
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
