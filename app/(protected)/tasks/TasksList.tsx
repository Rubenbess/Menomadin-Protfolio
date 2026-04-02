'use client'

import { format } from 'date-fns'
import { formatDueDate, isTaskOverdue } from '@/lib/task-utils'
import TaskStatusBadge from '@/components/ui/TaskStatusBadge'
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge'
import TaskAssigneesStack from '@/components/ui/TaskAssigneesStack'
import { Pencil, Trash2 } from 'lucide-react'
import type { TaskWithRelations } from '@/lib/types'

interface Props {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onTaskUpdate: (task: TaskWithRelations) => void
}

export default function TasksList({ tasks, onTaskClick, onTaskUpdate }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p>No tasks</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-white sticky top-0">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 w-1/3">Task</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">Priority</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">Due Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">Assignees</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600">Company</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 w-12">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map(task => {
              const overdue = isTaskOverdue(task)
              return (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-brand-500 group-hover:underline transition-colors">{task.title}</p>
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onTaskClick(task)}
                      className="hover:opacity-80 transition-opacity"
                      title="Click to edit status"
                    >
                      <TaskStatusBadge status={task.status} />
                    </button>
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onTaskClick(task)}
                      className="hover:opacity-80 transition-opacity"
                      title="Click to edit priority"
                    >
                      <TaskPriorityBadge priority={task.priority} size="sm" />
                    </button>
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onTaskClick(task)}
                      className="hover:text-brand-500 transition-colors"
                      title="Click to edit due date"
                    >
                      {task.due_date ? (
                        <span className={`text-sm font-medium ${
                          overdue
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}>
                          {format(new Date(task.due_date), 'MMM dd')}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onTaskClick(task)}
                      className="hover:opacity-80 transition-opacity"
                      title="Click to edit assignees"
                    >
                      {task.assignees && task.assignees.length > 0 ? (
                        <TaskAssigneesStack assignees={task.assignees} />
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onTaskClick(task)}
                      className="text-sm text-slate-600 hover:text-brand-500 transition-colors"
                      title="Click to edit company"
                    >
                      {task.company ? (
                        <span>{task.company.name}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onTaskClick(task)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit task"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${task.title}"?`)) {
                            // Delete logic will be handled by parent
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
