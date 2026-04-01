'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { updateTask } from '@/actions/tasks'
import type { TaskWithRelations } from '@/lib/types'

interface Props {
  task: TaskWithRelations
  onClose: () => void
  onTaskUpdated: (task: TaskWithRelations) => void
  companies: { id: string; name: string }[]
  teamMembers: { id: string; name: string; color: string }[]
}

const inp = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 dark:focus:border-violet-500 focus:bg-white dark:focus:bg-slate-700 transition-all'
const lbl = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5'

export default function TaskEditModal({
  task,
  onClose,
  onTaskUpdated,
  companies,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [status, setStatus] = useState(task.status)
  const [priority, setPriority] = useState(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [companyId, setCompanyId] = useState(task.company_id || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      setLoading(false)
      return
    }

    const result = await updateTask(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      due_date: dueDate || null,
      company_id: companyId || null,
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (result.data) {
      onTaskUpdated(result.data as TaskWithRelations)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Task</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className={lbl}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inp}
              placeholder="Task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this task..."
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 dark:focus:border-violet-500 focus:bg-white dark:focus:bg-slate-700 transition-all resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className={lbl}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className={inp}
            >
              <option value="To do">To do</option>
              <option value="In progress">In progress</option>
              <option value="Waiting">Waiting</option>
              <option value="Done">Done</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className={lbl}>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className={inp}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className={lbl}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inp}
            />
          </div>

          {/* Company */}
          <div>
            <label className={lbl}>Company</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className={inp}
            >
              <option value="">Select company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
