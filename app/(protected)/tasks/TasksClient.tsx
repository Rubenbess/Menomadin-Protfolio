'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Plus, LayoutList, Kanban, BarChart2, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import TasksBoard from './TasksBoard'
import TasksList from './TasksList'
import TaskDetailModal from './TaskDetailModal'
import TaskForm from '@/components/forms/TaskForm'
import { filterTasks, groupTasksByStatus, sortTasks } from '@/lib/task-utils'
import type { TaskWithRelations, TaskStatus } from '@/lib/types'

interface Props {
  initialTasks: TaskWithRelations[]
  allLabels: { id: string; name: string; color: string | null }[]
  teamMembers: { id: string; name: string; color: string }[]
  companies: { id: string; name: string }[]
}

type ViewType = 'list' | 'board'

export default function TasksClient({ initialTasks, allLabels, teamMembers, companies }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks)
  const [view, setView] = useState<ViewType>('list')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // Group by status for board view (unfiltered for stats)
  const groupedByStatus = useMemo(() => {
    return groupTasksByStatus(tasks)
  }, [tasks])

  // Stats (from all tasks, not filtered)
  const stats = {
    total: tasks.length,
    active: tasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled').length,
    completed: tasks.filter(t => t.status === 'Done').length,
    overdue: tasks.filter(t => {
      if (!t.due_date || t.status === 'Done' || t.status === 'Cancelled') return false
      const dueDate = new Date(t.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return dueDate < today
    }).length,
  }

  const handleTaskCreated = (newTask: TaskWithRelations) => {
    setTasks([newTask, ...tasks])
    setShowCreateForm(false)
    router.refresh()
  }

  const handleTaskUpdated = (updatedTask: TaskWithRelations) => {
    setTasks(tasks.map(t => (t.id === updatedTask.id ? updatedTask : t)))
    setSelectedTask(updatedTask)
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId))
    setSelectedTask(null)
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${view === 'list' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutList size={12} /> List
            </button>
            <button
              onClick={() => setView('board')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${view === 'board' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Kanban size={12} /> Board
            </button>
          </div>
          <button
            onClick={() => router.refresh()}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh tasks"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <Button onClick={() => setShowCreateForm(true)} size="sm">
          <Plus size={14} /> Add task
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',      count: stats.total,      color: 'text-violet-600',     bg: 'bg-violet-50   border-violet-200' },
          { label: 'Active',     count: stats.active,     color: 'text-blue-600',       bg: 'bg-blue-50    border-blue-200' },
          { label: 'Completed',  count: stats.completed,  color: 'text-emerald-600',    bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Overdue',    count: stats.overdue,    color: stats.overdue > 0 ? 'text-red-600' : 'text-slate-400', bg: stats.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* List/Board View */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] px-5 py-16 text-center">
          <CheckSquare size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500 mb-4">No tasks yet</p>
          <Button onClick={() => setShowCreateForm(true)} variant="secondary">
            <Plus size={14} /> Create your first task
          </Button>
        </div>
      ) : view === 'list' ? (
        <TasksList
          tasks={Object.values(groupedByStatus).flat()}
          onTaskClick={setSelectedTask}
          onTaskUpdate={handleTaskUpdated}
        />
      ) : (
        <TasksBoard
          groupedTasks={groupedByStatus}
          onTaskClick={setSelectedTask}
          onTaskCreate={() => setShowCreateForm(true)}
          onTaskEdit={setSelectedTask}
        />
      )}

      {/* Modals */}
      {showCreateForm && (
        <TaskForm
          onClose={() => setShowCreateForm(false)}
          onTaskCreated={handleTaskCreated}
          companies={companies}
          teamMembers={teamMembers}
          allLabels={allLabels}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          companies={companies}
          teamMembers={teamMembers}
          allLabels={allLabels}
        />
      )}
    </div>
  )
}
