'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { createTask } from '@/actions/tasks'
import type { TaskWithRelations } from '@/lib/types'

interface Props {
  onClose: () => void
  onTaskCreated: (task: TaskWithRelations) => void
  companies: { id: string; name: string }[]
  teamMembers: { id: string; name: string; color: string }[]
  allLabels: { id: string; name: string; color: string | null }[]
}

const inp = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 dark:focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all'
const lbl = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'

export default function TaskForm({
  onClose,
  onTaskCreated,
  companies,
  teamMembers,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const fd = new FormData(e.currentTarget)

      const priorityValue = (fd.get('priority') as string) || 'medium'
      const assigneeIds = fd.getAll('assignee_ids').map(id => id.toString()).filter(id => id)

      const data = {
        title: (fd.get('title') as string).trim(),
        description: ((fd.get('description') as string)?.trim() || null) as string | null,
        priority: priorityValue as 'high' | 'medium' | 'low',
        status: 'To do' as const,
        due_date: (fd.get('due_date') as string) || null,
        company_id: (fd.get('company_id') as string) || null,
        assignee_ids: assigneeIds,
      }

      if (!data.title) {
        setError('Title is required')
        setLoading(false)
        return
      }

      const result = await createTask(data)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      if (result.data) {
        onTaskCreated(result.data as TaskWithRelations)
      }
      setLoading(false)
      onClose()
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Task</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className={lbl}>Title *</label>
            <input
              name="title"
              required
              autoFocus
              className={inp}
              placeholder="e.g., Schedule board meeting"
            />
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Description</label>
            <textarea
              name="description"
              rows={3}
              className={`${inp} resize-none`}
              placeholder="Add more details about this task..."
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Priority</label>
              <select name="priority" defaultValue="medium" className={inp}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Due Date</label>
              <input name="due_date" type="date" className={inp} />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className={lbl}>Company</label>
            <select name="company_id" className={inp}>
              <option value="">— No company —</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignees */}
          <div>
            <label className={lbl}>Assignees</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {teamMembers.map(member => (
                <label key={member.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="assignee_ids"
                    value={member.id}
                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 dark:bg-slate-800 dark:border-slate-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl px-3 py-2.5 ring-1 ring-red-200 dark:ring-red-900">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" loading={loading} className="flex-1">
              Create Task
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
