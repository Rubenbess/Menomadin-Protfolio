'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Plus, LayoutList, Kanban, RefreshCw, Trash2, CheckCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import TasksBoard from './TasksBoard'
import TasksList from './TasksList'
import TaskDetailModal from './TaskDetailModal'
import TaskForm from '@/components/forms/TaskForm'
import TasksFilters from './TasksFilters'
import { groupTasksByStatus, searchTasks } from '@/lib/task-utils'
import { deleteTask } from '@/actions/tasks'
import type { TaskWithRelations, TaskStatus } from '@/lib/types'

interface Props {
  initialTasks: TaskWithRelations[]
  allLabels: { id: string; name: string; color: string | null }[]
  teamMembers: { id: string; name: string; color: string }[]
  companies: { id: string; name: string }[]
}

type ViewType = 'list' | 'board'
type QuickFilter = 'all' | 'mine' | 'overdue' | 'today' | 'this-week'

export default function TasksClient({ initialTasks, allLabels, teamMembers, companies }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks)
  const [view, setView] = useState<ViewType>('list')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [companyFilter, setCompanyFilter] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(true)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === '/') e.preventDefault()
        return
      }

      // N - New task
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowCreateForm(true)
      }
      // B - Toggle board/list
      else if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setView(v => v === 'list' ? 'board' : 'list')
      }
      // / - Focus search
      else if (e.key === '/') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      }
      // ? - Show help
      else if (e.shiftKey && e.key === '?') {
        e.preventDefault()
        setShowKeyboardHelp(!showKeyboardHelp)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showKeyboardHelp])

  // Apply search and filters
  const filteredTasks = useMemo(() => {
    let result = tasks

    // Apply search
    if (searchQuery.trim()) {
      result = searchTasks(result, searchQuery)
    }

    // Apply quick filters
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(today)
    endOfWeek.setDate(today.getDate() + 7)

    if (quickFilter === 'overdue') {
      result = result.filter(t => isTaskOverdue(t))
    } else if (quickFilter === 'today') {
      result = result.filter(t => isTaskDueToday(t))
    } else if (quickFilter === 'this-week') {
      result = result.filter(t => isTaskDueThisWeek(t))
    }

    // Apply sidebar filters
    if (statusFilter.length > 0) {
      result = result.filter(t => statusFilter.includes(t.status))
    }
    if (priorityFilter.length > 0) {
      result = result.filter(t => priorityFilter.includes(t.priority))
    }
    if (companyFilter) {
      result = result.filter(t => t.company_id === companyFilter)
    }
    if (!showCompleted) {
      result = result.filter(t => t.status !== 'Done')
    }

    return result
  }, [tasks, searchQuery, quickFilter, statusFilter, priorityFilter, companyFilter, showCompleted])

  // Group by status for board view
  const groupedByStatus = useMemo(() => {
    return groupTasksByStatus(filteredTasks)
  }, [filteredTasks])

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

  // Import isTaskOverdue etc - add these at the top
  function isTaskOverdue(task: TaskWithRelations): boolean {
    if (!task.due_date) return false
    if (task.status === 'Done' || task.status === 'Cancelled') return false
    const dueDate = new Date(task.due_date)
    const checkToday = new Date()
    checkToday.setHours(0, 0, 0, 0)
    return dueDate < checkToday
  }

  function isTaskDueToday(task: TaskWithRelations): boolean {
    if (!task.due_date) return false
    if (task.status === 'Done' || task.status === 'Cancelled') return false
    const dueDate = new Date(task.due_date)
    const checkToday = new Date()
    checkToday.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() === checkToday.getTime()
  }

  function isTaskDueThisWeek(task: TaskWithRelations): boolean {
    if (!task.due_date) return false
    if (task.status === 'Done' || task.status === 'Cancelled') return false
    const dueDate = new Date(task.due_date)
    const checkToday = new Date()
    const checkEndOfWeek = new Date(checkToday)
    checkEndOfWeek.setDate(checkToday.getDate() + 7)
    checkToday.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    checkEndOfWeek.setHours(0, 0, 0, 0)
    return dueDate >= checkToday && dueDate <= checkEndOfWeek
  }

  const handleTaskCreated = (newTask: TaskWithRelations) => {
    setShowCreateForm(false)
    setTasks([newTask, ...tasks])
    // Refresh to ensure server state is synced
    setTimeout(() => router.refresh(), 100)
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
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="page-header border-b border-slate-200 dark:border-slate-800">
        <div className="flex-1">
          <h1 className="page-title">Tasks</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Organize and track your work in real time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-200 dark:bg-slate-800 p-1">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${view === 'list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setView('board')}
              className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${view === 'board' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <Kanban size={16} />
            </button>
          </div>
          <button
            onClick={() => router.refresh()}
            className="p-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <Button onClick={() => setShowCreateForm(true)} size="sm">
            <Plus size={16} /> New task
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8 px-6">
        {[
          { label: 'Total', count: stats.total, icon: '📊' },
          { label: 'Active', count: stats.active, icon: '⚡' },
          { label: 'Done', count: stats.completed, icon: '✓' },
          { label: 'Overdue', count: stats.overdue, icon: '⚠️' },
        ].map(s => (
          <div key={s.label} className="card px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="section-title">{s.label}</p>
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="px-6 mb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-6 overflow-x-auto pb-4">
          {[
            { id: 'all', label: 'All Tasks', count: filteredTasks.length },
            { id: 'overdue', label: 'Overdue', count: tasks.filter(t => isTaskOverdue(t)).length },
            { id: 'today', label: 'Today', count: tasks.filter(t => isTaskDueToday(t)).length },
            { id: 'this-week', label: 'This Week', count: tasks.filter(t => isTaskDueThisWeek(t)).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setQuickFilter(tab.id as QuickFilter)}
              className={`px-1 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                quickFilter === tab.id
                  ? 'border-gold-500 text-gold-600 dark:text-gold-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {tab.label} <span className="text-xs font-normal ml-1 opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Sidebar + Tasks View */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Sidebar Filters */}
        <TasksFilters
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          companyFilter={companyFilter || ''}
          includeCompleted={showCompleted}
          companies={companies}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          onCompanyChange={(id) => setCompanyFilter(id || null)}
          onIncludeCompletedChange={setShowCompleted}
          stats={stats}
        />

        {/* Tasks Content */}
        <div className="flex-1 flex flex-col overflow-hidden px-6 py-6">
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field-input w-full"
            />
          </div>

          {filteredTasks.length === 0 && tasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No tasks yet</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">Create your first task to get started</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus size={16} /> Create task
                </Button>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No matches found</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">Try adjusting your filters</p>
                <Button onClick={() => {
                  setSearchQuery('')
                  setQuickFilter('all')
                  setStatusFilter([])
                  setPriorityFilter([])
                  setCompanyFilter(null)
                }} variant="secondary">
                  Clear all
                </Button>
              </div>
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

      {/* Keyboard Help */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'N', action: 'Create new task' },
                { key: 'B', action: 'Toggle board/list view' },
                { key: '/', action: 'Focus search bar' },
                { key: '?', action: 'Show this help' },
              ].map(({ key, action }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{action}</span>
                  <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
