'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import TaskStatusBadge from '@/components/ui/TaskStatusBadge'
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge'
import type { TaskWithRelations } from '@/lib/types'

interface Props {
  tasks: TaskWithRelations[]
  companyId: string
  companyName: string
  onCreateTask?: () => void
  onTaskClick?: (task: TaskWithRelations) => void
}

type StatusFilter = 'all' | 'active' | 'completed'

export default function CompanyTasks({
  tasks,
  companyId,
  companyName,
  onCreateTask,
  onTaskClick,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

  // Filter tasks by status
  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'active') return task.status !== 'Done' && task.status !== 'Cancelled'
    if (statusFilter === 'completed') return task.status === 'Done'
    return true
  })

  // Calculate stats
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

  if (tasks.length === 0) {
    return (
      <div className="space-y-4 py-8">
        <div className="text-center">
          <p className="text-4xl mb-2">📋</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-600 mb-4">
            No tasks created for this company yet
          </p>
          {onCreateTask && (
            <Button onClick={onCreateTask} size="sm">
              <Plus size={16} /> Create Task
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', count: stats.total, icon: '📊' },
          { label: 'Active', count: stats.active, icon: '⚡' },
          { label: 'Done', count: stats.completed, icon: '✓' },
          { label: 'Overdue', count: stats.overdue, icon: '⚠️' },
        ].map(s => (
          <div key={s.label} className="card px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="section-title text-xs">{s.label}</p>
              <span className="text-lg">{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
        {(['all', 'active', 'completed'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all capitalize ${
              statusFilter === filter
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-600 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-slate-300'
            }`}
          >
            {filter} ({filteredTasks.length})
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-neutral-500 dark:text-neutral-600">
            No {statusFilter === 'all' ? '' : statusFilter} tasks
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <button
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="w-full p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-neutral-900 dark:text-white mb-2">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-500 mb-2 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} size="sm" />
                    {task.due_date && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        new Date(task.due_date) < new Date()
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {new Date(task.due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex -space-x-2 flex-shrink-0">
                    {task.assignees.slice(0, 3).map(assignee => (
                      <div
                        key={assignee.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold border border-white dark:border-neutral-800"
                        style={{ backgroundColor: assignee.team_member?.color || '#6366f1' }}
                        title={assignee.team_member?.name}
                      >
                        {assignee.team_member?.name?.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {task.assignees.length > 3 && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-neutral-400 border border-white dark:border-neutral-800">
                        +{task.assignees.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* View All Link */}
      {tasks.length > 0 && (
        <div className="pt-2 text-center">
          <a
            href={`/tasks?company=${companyId}`}
            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            View all company tasks in full view →
          </a>
        </div>
      )}
    </div>
  )
}
