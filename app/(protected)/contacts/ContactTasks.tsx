'use client'

import { useState, useEffect } from 'react'
import { Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import type { TaskWithRelations } from '@/lib/types'

interface Props {
  contactId: string
  contactName: string
}

export default function ContactTasks({ contactId, contactName }: Props) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const toast = useToast()

  // Load tasks on mount
  useEffect(() => {
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId])

  async function loadTasks() {
    setLoadError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignees:task_assignees(
            id,
            task_id,
            assigned_to,
            assigned_at,
            assigned_by,
            team_member:team_members(id, name, color)
          ),
          company:companies(id, name)
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks((data ?? []) as unknown as TaskWithRelations[])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load tasks'
      setLoadError(msg)
      toast.error('Failed to load tasks', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return

    try {
      setCreating(true)
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          contact_id: contactId,
          status: 'To do',
          priority: 'medium',
        }),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.error ?? `Request failed (${response.status})`)
      }
      const result = await response.json()
      if (result.data) {
        setTasks([result.data, ...tasks])
        setNewTaskTitle('')
        setShowCreateForm(false)
        toast.success('Task created')
      } else {
        throw new Error('Server returned no task')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create task'
      toast.error('Failed to create task', { description: msg })
    } finally {
      setCreating(false)
    }
  }

  const statusColors: Record<string, { icon: React.ReactNode; color: string }> = {
    'To do': { icon: <AlertCircle size={14} />, color: 'text-neutral-500' },
    'In progress': { icon: <Clock size={14} />, color: 'text-amber-500' },
    'Done': { icon: <CheckCircle2 size={14} />, color: 'text-emerald-500' },
    'Waiting': { icon: <Clock size={14} />, color: 'text-blue-500' },
    'Cancelled': { icon: <AlertCircle size={14} />, color: 'text-slate-300' },
  }

  if (loading) {
    return <div className="text-xs text-neutral-500 text-center py-4">Loading tasks…</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Follow-up Tasks ({tasks.length})</p>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium"
        >
          <Plus size={12} /> New
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-neutral-50 rounded-lg p-3 ring-1 ring-slate-200 space-y-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            placeholder={`Follow-up task for ${contactName}…`}
            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-primary-500"
            onKeyPress={e => e.key === 'Enter' && handleCreateTask()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateTask}
              disabled={creating || !newTaskTitle.trim()}
              className="flex-1 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 text-neutral-600 hover:text-neutral-800 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loadError ? (
        <div className="text-xs text-red-600 text-center py-4 space-y-2">
          <p>Couldn't load tasks: {loadError}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); loadTasks() }}
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            Retry
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-4 space-y-2">
          <p className="text-xs text-neutral-500">No follow-up tasks yet.</p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium"
          >
            <Plus size={12} /> Create follow-up task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const statusInfo = statusColors[task.status] || statusColors['To do']
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 p-2.5 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <div className={`mt-0.5 flex-shrink-0 ${statusInfo.color}`}>
                  {statusInfo.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-800 truncate">{task.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-block px-1.5 py-0.5 bg-white text-neutral-700 border border-neutral-200 rounded text-xs">
                      {task.status}
                    </span>
                    {task.priority && (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                          task.priority === 'high'
                            ? 'bg-red-50 text-red-600'
                            : task.priority === 'medium'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
