'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTask, updateTask } from '@/actions/tasks'
import Button from '@/components/ui/Button'

interface Company {
  id: string
  name: string
}

interface TeamMember {
  id: string
  name: string
  color: string
  role: string | null
}

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  company_id: string | null
  assignee_id: string | null
  task_participants?: Array<{ team_member_id: string }>
}

interface TaskFormProps {
  task?: Task | null
  companies: Company[]
  teamMembers: TeamMember[]
  defaultStatus?: string
  onClose: () => void
  onSuccess: () => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function TaskForm({
  task,
  companies,
  teamMembers,
  defaultStatus = 'not-started',
  onClose,
  onSuccess,
}: TaskFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? '')
  const [participantIds, setParticipantIds] = useState<string[]>(
    task?.task_participants?.map(p => p.team_member_id) ?? []
  )

  function toggleParticipant(id: string) {
    setParticipantIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const title = (fd.get('title') as string)?.trim()
    const description = (fd.get('description') as string)?.trim() || null
    const status = fd.get('status') as string
    const priority = fd.get('priority') as string
    const due_date = (fd.get('due_date') as string) || null
    const company_id = (fd.get('company_id') as string) || null
    if (!title) {
      setError('Title is required')
      setLoading(false)
      return
    }

    const data = {
      title,
      description,
      status,
      priority,
      due_date,
      company_id,
      assignee_id: assigneeId || null,
    }

    const filteredParticipants = participantIds.filter(id => id !== assigneeId)

    try {
      const result = task
        ? await updateTask(task.id, data, filteredParticipants)
        : await createTask(data, filteredParticipants)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.refresh()
      onSuccess()
      onClose()
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="field-label">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          className="field-input"
          placeholder="Task title"
          defaultValue={task?.title ?? ''}
          required
          autoFocus
        />
      </div>

      <div>
        <label className="field-label">Description</label>
        <textarea
          name="description"
          className="field-input min-h-[80px] resize-none"
          placeholder="Optional description..."
          defaultValue={task?.description ?? ''}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Status</label>
          <select
            name="status"
            className="field-select"
            defaultValue={task?.status ?? defaultStatus}
          >
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div>
          <label className="field-label">Priority</label>
          <select
            name="priority"
            className="field-select"
            defaultValue={task?.priority ?? 'medium'}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div>
        <label className="field-label">Due Date</label>
        <input
          type="date"
          name="due_date"
          className="field-input"
          defaultValue={task?.due_date ?? ''}
        />
      </div>

      <div>
        <label className="field-label">Company</label>
        <select
          name="company_id"
          className="field-select"
          defaultValue={task?.company_id ?? ''}
        >
          <option value="">No company</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Owner</label>
        <select
          name="assignee_id"
          className="field-select"
          value={assigneeId}
          onChange={e => setAssigneeId(e.target.value)}
        >
          <option value="">No owner</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {teamMembers.length > 0 && (
        <div>
          <label className="field-label">Participants</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {teamMembers
              .filter(m => m.id !== assigneeId)
              .map(m => {
                const selected = participantIds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleParticipant(m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      selected
                        ? 'border-violet-400 bg-violet-50 text-violet-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                      style={{ backgroundColor: m.color }}
                    >
                      {getInitials(m.name)}
                    </span>
                    {m.name}
                    {selected && <span className="text-violet-500 font-bold">✓</span>}
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  )
}
