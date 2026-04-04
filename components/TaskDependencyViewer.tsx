'use client'

import { useState, useEffect } from 'react'
import { Link as LinkIcon, Unlink, ChevronRight, AlertCircle } from 'lucide-react'
import { getTaskDependencies, type SimpleTask } from '@/actions/task-dependencies'
import TaskStatusBadge from '@/components/ui/TaskStatusBadge'

interface Props {
  taskId: string
  onTaskClick?: (taskId: string) => void
}

export function TaskDependencyViewer({ taskId, onTaskClick }: Props) {
  const [loading, setLoading] = useState(false)
  const [parentTask, setParentTask] = useState<SimpleTask | null>(null)
  const [blockedByTasks, setBlockedByTasks] = useState<SimpleTask[]>([])

  useEffect(() => {
    const loadDependencies = async () => {
      setLoading(true)
      const result = await getTaskDependencies(taskId)
      if (!result.error) {
        setParentTask(result.parentTask)
        setBlockedByTasks(result.blockedBy)
      }
      setLoading(false)
    }
    loadDependencies()
  }, [taskId])

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-600">Loading dependencies...</p>
      </div>
    )
  }

  if (!parentTask && blockedByTasks.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-600">No dependencies</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Blocked By */}
      {parentTask && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
            <AlertCircle size={14} className="text-orange-500" />
            Blocked by
          </label>
          <button
            onClick={() => onTaskClick?.(parentTask.id)}
            className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {parentTask.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <TaskStatusBadge status={parentTask.status} />
                  {parentTask.status !== 'Done' && (
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      Not completed yet
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-neutral-400 flex-shrink-0" />
            </div>
          </button>
        </div>
      )}

      {/* Blocking */}
      {blockedByTasks.length > 0 && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
            <LinkIcon size={14} className="text-blue-500" />
            Blocking ({blockedByTasks.length})
          </label>
          <div className="space-y-2">
            {blockedByTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onTaskClick?.(task.id)}
                className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {task.title}
                    </p>
                    <div className="mt-1">
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-neutral-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
