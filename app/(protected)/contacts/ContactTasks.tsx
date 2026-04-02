'use client'

import { useState, useEffect } from 'react'
import { Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { TaskWithRelations } from '@/lib/types'

interface Props {
  contactId: string
  contactName: string
}

export default function ContactTasks({ contactId, contactName }: Props) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [creating, setCreating] = useState(false)

  // Load tasks on mount
  useEffect(() => {
    loadTasks()
  }, [contactId])

  async function loadTasks() {
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

      if (!error && data) {
        setTasks(data as unknown as TaskWithRelations[])
      }
    } catch (err) {
      console.error('Failed to load tasks:', err)
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

      const result = await response.json()
      if (result.data) {
        setTasks([result.data, ...tasks])
        setNewTaskTitle('')
        setShowCreateForm(false)
      }
    } catch (err) {
      console.error('Failed to create task:', err)
    } finally {
      setCreating(false)
    }
  }

  const statusColors: Record<string, { icon: React.ReactNode; color: string }> = {
    'To do': { icon: <AlertCircle size={14} />, color: 'text-slate-400' },
    'In progress': { icon: <Clock size={14} />, color: 'text-amber-500' },
    'Done': { icon: <CheckCircle2 size={14} />, color: 'text-emerald-500' },
    'Waiting': { icon: <Clock size={14} />, color: 'text-blue-500' },
    'Cancelled': { icon: <AlertCircle size={14} />, color: 'text-slate-300' },
  }

  if (loading) {
    return <div className="text-xs text-slate-400 text-center py-4">Loading tasks…</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Follow-up Tasks ({tasks.length})</p>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1 text-xs text-gold-500 hover:text-gold-600 font-medium"
        >
          <Plus size={12} /> New
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-slate-50 rounded-xl p-3 ring-1 ring-slate-200 space-y-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            placeholder={`Follow-up task for ${contactName}…`}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500"
            onKeyPress={e => e.key === 'Enter' && handleCreateTask()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateTask}
              disabled={creating || !newTaskTitle.trim()}
              className="flex-1 px-3 py-1.5 bg-gold-500 text-white rounded-lg text-xs font-semibold hover:bg-gold-600 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">No follow-up tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const statusInfo = statusColors[task.status] || statusColors['To do']
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className={`mt-0.5 flex-shrink-0 ${statusInfo.color}`}>
                  {statusInfo.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{task.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-block px-1.5 py-0.5 bg-white text-slate-600 border border-slate-200 rounded text-xs">
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
