'use client'

import { useState } from 'react'
import { X, Calendar, Flag, User, Building2, MessageSquare, FileUp, Tag } from 'lucide-react'
import Button from '@/components/ui/Button'
import TaskStatusBadge from '@/components/ui/TaskStatusBadge'
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge'
import TaskAssigneesStack from '@/components/ui/TaskAssigneesStack'
import TaskCommentForm from '@/components/forms/TaskCommentForm'
import { formatDueDate, isTaskOverdue } from '@/lib/task-utils'
import { completeTask, cancelTask, deleteTask, assignTask, removeAssignee } from '@/actions/tasks'
import type { TaskWithRelations, TaskStatus } from '@/lib/types'

interface Props {
  task: TaskWithRelations
  onClose: () => void
  onTaskUpdated: (task: TaskWithRelations) => void
  onTaskDeleted: (taskId: string) => void
  companies: { id: string; name: string }[]
  teamMembers: { id: string; name: string; color: string }[]
  allLabels: { id: string; name: string; color: string | null }[]
}

export default function TaskDetailModal({
  task,
  onClose,
  onTaskDeleted,
  teamMembers,
  companies,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    const result = await completeTask(task.id)
    if (!result.error) {
      onTaskDeleted(task.id)
      onClose()
    }
    setIsCompleting(false)
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    const result = await cancelTask(task.id)
    if (!result.error) {
      onTaskDeleted(task.id)
      onClose()
    }
    setIsCancelling(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure? This cannot be undone.')) return

    setIsDeleting(true)
    const result = await deleteTask(task.id)
    if (!result.error) {
      onTaskDeleted(task.id)
      onClose()
    }
    setIsDeleting(false)
  }

  const handleAssign = async (memberId: string) => {
    const result = await assignTask(task.id, memberId)
    if (result.error) {
      console.error('Error assigning task:', result.error)
    }
  }

  const handleRemoveAssignee = async (assigneeId: string) => {
    const result = await removeAssignee(task.id, assigneeId)
    if (result.error) {
      console.error('Error removing assignee:', result.error)
    }
  }

  const overdue = isTaskOverdue(task)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate pr-4">
            {task.title}
          </h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Status</h3>
            <div className="flex items-center gap-3">
              <TaskStatusBadge status={task.status} />
              <div className="flex gap-2">
                {task.status !== 'Done' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleComplete}
                    loading={isCompleting}
                  >
                    Mark Complete
                  </Button>
                )}
                {task.status !== 'Cancelled' && task.status !== 'Done' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCancel}
                    loading={isCancelling}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Flag size={16} />
                Priority
              </label>
              <TaskPriorityBadge priority={task.priority} size="md" />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Calendar size={16} />
                Due Date
              </label>
              {task.due_date ? (
                <div>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {new Date(task.due_date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className={`text-xs font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {formatDueDate(task)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">No due date</p>
              )}
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <User size={16} />
              Assignees
            </label>
            {task.assignees && task.assignees.length > 0 ? (
              <div className="space-y-2">
                <TaskAssigneesStack assignees={task.assignees} maxDisplay={5} />
                <div className="flex flex-wrap gap-2">
                  {task.assignees.map(assignee => (
                    <div
                      key={assignee.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"
                    >
                      <span className="text-sm text-slate-900 dark:text-white">
                        {assignee.team_member?.name}
                      </span>
                      <button
                        onClick={() => handleRemoveAssignee(assignee.assigned_to)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">No assignees</p>
            )}

            <div className="pt-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssign(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">+ Add assignee</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Company */}
          {task.company && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Building2 size={16} />
                Company
              </label>
              <p className="text-sm text-slate-600 dark:text-slate-400">{task.company.name}</p>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-900 dark:text-white">
                Description
              </label>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Tag size={16} />
                Labels
              </label>
              <div className="flex flex-wrap gap-2">
                {task.labels.map(label => (
                  <span
                    key={label.id}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: label.color || '#6366f1' }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <MessageSquare size={16} />
              Comments
            </label>

            <TaskCommentForm taskId={task.id} />

            {/* Comments List */}
            {task.comments && task.comments.length > 0 && (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {task.comments
                  .filter(c => !c.is_activity)
                  .map(comment => (
                    <div key={comment.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {comment.author?.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {comment.content}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          {task.activities && task.activities.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Activity</h4>
              <div className="space-y-2 text-sm">
                {task.activities.slice(0, 5).map(activity => (
                  <div key={activity.id} className="text-xs text-slate-500 dark:text-slate-400">
                    <strong>{activity.action_type.replace(/_/g, ' ')}</strong> •{' '}
                    {new Date(activity.created_at).toLocaleDateString()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between">
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={isDeleting}
          >
            Delete
          </Button>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
