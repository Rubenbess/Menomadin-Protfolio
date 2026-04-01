'use client'

import { format } from 'date-fns'
import { getStatusColor, getPriorityColor, formatDueDate, isTaskOverdue } from '@/lib/task-utils'
import TaskStatusBadge from '@/components/ui/TaskStatusBadge'
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge'
import TaskAssigneesStack from '@/components/ui/TaskAssigneesStack'
import type { TaskWithRelations } from '@/lib/types'

interface Props {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onTaskUpdate: (task: TaskWithRelations) => void
}

export default function TasksList({ tasks, onTaskClick }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <p>No tasks match your filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 sticky top-0">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Task</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Priority</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Due Date</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Assignees</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Company</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {tasks.map(task => {
            const overdue = isTaskOverdue(task)
            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <TaskStatusBadge status={task.status} />
                </td>
                <td className="px-6 py-4">
                  <TaskPriorityBadge priority={task.priority} />
                </td>
                <td className="px-6 py-4">
                  {task.due_date ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-slate-900 dark:text-white">
                        {format(new Date(task.due_date), 'MMM dd')}
                      </span>
                      <span className={`text-xs font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {formatDueDate(task)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {task.assignees && task.assignees.length > 0 ? (
                    <TaskAssigneesStack assignees={task.assignees} />
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {task.company ? (
                    <span className="text-sm text-slate-600 dark:text-slate-400">{task.company.name}</span>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
