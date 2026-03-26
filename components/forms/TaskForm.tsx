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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

    const result = task
      ? await updateTask(task.id, data)
      : await createTask(data)

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

      <div>
        <label className="field-label">Assignee</label>
        <select
          className="field-select"
          value={assigneeId}
          onChange={e => setAssigneeId(e.target.value)}
        >
          <option value="">Unassigned</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

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
