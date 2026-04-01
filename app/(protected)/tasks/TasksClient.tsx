'use client'

import { useState, useMemo } from 'react'
import { CheckSquare, Plus, LayoutList, Kanban } from 'lucide-react'
import Button from '@/components/ui/Button'
import TasksBoard from './TasksBoard'
import TasksList from './TasksList'
import TasksFilters from './TasksFilters'
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
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks)
  const [view, setView] = useState<ViewType>('board')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [sortBy, setSortBy] = useState<'due-date' | 'priority' | 'created' | 'updated'>('due-date')

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string>('')
  const [companyFilter, setCompanyFilter] = useState<string>('')
  const [includeCompleted, setIncludeCompleted] = useState(true)

  // Apply filters and sorting
  const filteredAndSorted = useMemo(() => {
    let filtered = filterTasks(tasks, {
      status: statusFilter.length > 0 ? statusFilter : undefined,
      priority: priorityFilter.length > 0 ? priorityFilter : undefined,
      companyId: companyFilter ? companyFilter : undefined,
      includeCompleted,
    })

    return sortTasks(filtered, sortBy)
  }, [tasks, statusFilter, priorityFilter, companyFilter, includeCompleted, sortBy])

  // Group by status for board view
  const groupedByStatus = useMemo(() => {
    return groupTasksByStatus(filteredAndSorted)
  }, [filteredAndSorted])

  // Stats
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare size={24} className="text-violet-600 dark:text-violet-400" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasks</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {stats.active} active • {stats.completed} completed {stats.overdue > 0 && `• ${stats.overdue} overdue`}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus size={16} />
            Create Task
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filters Sidebar */}
        <TasksFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          companyFilter={companyFilter}
          onCompanyChange={setCompanyFilter}
          includeCompleted={includeCompleted}
          onIncludeCompletedChange={setIncludeCompleted}
          companies={companies}
          stats={stats}
        />

        {/* Tasks View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View Controls */}
          <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded-lg transition-colors ${
                  view === 'list'
                    ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <LayoutList size={18} />
              </button>
              <button
                onClick={() => setView('board')}
                className={`p-2 rounded-lg transition-colors ${
                  view === 'board'
                    ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Kanban size={18} />
              </button>
            </div>

            {/* Sort Control */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="due-date">Sort: Due Date</option>
              <option value="priority">Sort: Priority</option>
              <option value="created">Sort: Created</option>
              <option value="updated">Sort: Updated</option>
            </select>
          </div>

          {/* View Content */}
          <div className="flex-1 overflow-auto">
            {filteredAndSorted.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <CheckSquare size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-500 dark:text-slate-400">No tasks yet</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-4 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-sm font-medium"
                  >
                    Create your first task
                  </button>
                </div>
              </div>
            ) : view === 'list' ? (
              <TasksList
                tasks={filteredAndSorted}
                onTaskClick={setSelectedTask}
                onTaskUpdate={handleTaskUpdated}
              />
            ) : (
              <TasksBoard
                groupedTasks={groupedByStatus}
                onTaskClick={setSelectedTask}
                onTaskUpdate={handleTaskUpdated}
              />
            )}
          </div>
        </div>
      </div>

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
