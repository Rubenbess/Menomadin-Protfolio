'use client'

import { useState } from 'react'
import { createTask, updateTask } from '@/actions/tasks'
import { TaskWithRelations, TaskStatus, TaskPriority } from '@/lib/types'
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

interface TaskFormProps {
  task?: TaskWithRelations | null
  companies: Company[]
  teamMembers: TeamMember[]
  defaultStatus?: TaskStatus
  onClose: () => void
  onSuccess: () => void
}

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export default function TaskForm({
  task,
  companies,
  teamMembers,
  defaultStatus = 'not-started',
  onClose,
  onSuccess,
}: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus)
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [companyId, setCompanyId] = useState(task?.company_id ?? '')
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? '')
  const [participantIds, setParticipantIds] = useState<string[]>(
    task?.task_participants?.map(p => p.team_member_id) ?? []
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function toggleParticipant(id: string) {
    setParticipantIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    const data = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      due_date: dueDate || null,
      company_id: companyId || null,
      assignee_id: assigneeId || null,
    }

    // Exclude owner from participants to avoid duplication
    const filteredParticipants = participantIds.filter(id => id !== assigneeId)

    const result = task
      ? await updateTask(task.id, data, filteredParticipants)
      : await createTask(data, filteredParticipants)

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    onSuccess()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="field-label">Title <span className="text-red-500">*</span></label>
        <input
          type="text"
          className="field-input"
          placeholder="Task title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div>
        <label className="field-label">Description</label>
        <textarea
          className="field-input min-h-[80px] resize-none"
          placeholder="Optional description..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Status</label>
          <select
            className="field-select"
            value={status}
            onChange={e => setStatus(e.target.value as TaskStatus)}
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
            className="field-select"
            value={priority}
            onChange={e => setPriority(e.target.value as TaskPriority)}
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
          className="field-input"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
      </div>

      <div>
        <label className="field-label">Company</label>
        <select
          className="field-select"
          value={companyId}
          onChange={e => setCompanyId(e.target.value)}
        >
          <option value="">No company</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Owner */}
      <div>
        <label className="field-label">Owner</label>
        <select
          className="field-select"
          value={assigneeId}
          onChange={e => setAssigneeId(e.target.value)}
        >
          <option value="">No owner</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Participants */}
      {teamMembers.length > 0 && (
        <div>
          <label className="field-label">
            Participants
            {participantIds.filter(id => id !== assigneeId).length > 0 && (
              <span className="ml-1.5 text-[10px] font-semibold bg-violet-100 text-violet-600 rounded-full px-1.5 py-0.5">
                {participantIds.filter(id => id !== assigneeId).length}
              </span>
            )}
          </label>
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
                    {selected && (
                      <span className="text-violet-500 font-bold leading-none">✓</span>
                    )}
                  </button>
                )
              })}
          </div>
          {teamMembers.filter(m => m.id !== assigneeId).length === 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Add more team members to assign participants.
            </p>
          )}
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
