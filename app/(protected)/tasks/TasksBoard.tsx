'use client'

import { isTaskOverdue, formatDueDate, getPriorityColor } from '@/lib/task-utils'
import TaskStatusBadge from '@/components/ui/TaskStatusBadge'
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge'
import TaskAssigneesStack from '@/components/ui/TaskAssigneesStack'
import type { Task, TaskStatus, TaskWithRelations } from '@/lib/types'

interface Props {
  groupedTasks: Record<TaskStatus, Task[]>
  onTaskClick: (task: TaskWithRelations) => void
  onTaskUpdate: (task: TaskWithRelations) => void
}

const STATUSES: TaskStatus[] = ['To do', 'In progress', 'Waiting', 'Done', 'Cancelled']
const STATUS_COLORS: Record<TaskStatus, string> = {
  'To do': 'bg-slate-50 dark:bg-slate-800/50',
  'In progress': 'bg-blue-50 dark:bg-blue-950/20',
  'Waiting': 'bg-amber-50 dark:bg-amber-950/20',
  'Done': 'bg-emerald-50 dark:bg-emerald-950/20',
  'Cancelled': 'bg-slate-50 dark:bg-slate-800/50',
}

export default function TasksBoard({ groupedTasks, onTaskClick }: Props) {
  return (
    <div className="overflow-x-auto h-full p-6">
      <div className="flex gap-4 h-full min-w-max">
        {STATUSES.map(status => {
          const tasks = groupedTasks[status]
          return (
            <div key={status} className="flex flex-col w-80 flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Column Header */}
              <div className={`${STATUS_COLORS[status]} px-4 py-3 border-b border-slate-200 dark:border-slate-800`}>
                <div className="flex items-center justify-between">
                  <TaskStatusBadge status={status} />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {tasks.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className={`flex-1 overflow-y-auto ${STATUS_COLORS[status]} p-4 space-y-3`}>
                {tasks.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-slate-400 dark:text-slate-500 text-sm">
                    No tasks
                  </div>
                ) : (
                  tasks.map(task => {
                    const overdue = isTaskOverdue(task as TaskWithRelations)
                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task as TaskWithRelations)}
                        className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-slate-950 cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-600"
                      >
                        {/* Title */}
                        <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-2 line-clamp-2">
                          {task.title}
                        </h4>

                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <TaskPriorityBadge priority={task.priority} />
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex gap-1">
                              {task.labels.slice(0, 2).map(label => (
                                <span
                                  key={label.id}
                                  className="px-2 py-1 rounded text-xs font-medium text-white"
                                  style={{
                                    backgroundColor: label.color || '#6366f1',
                                  }}
                                >
                                  {label.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Due Date */}
                        {task.due_date && (
                          <div className={`text-xs mb-3 font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {formatDueDate(task as TaskWithRelations)}
                          </div>
                        )}

                        {/* Assignees */}
                        {task.assignees && task.assignees.length > 0 && (
                          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <TaskAssigneesStack assignees={task.assignees} />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
