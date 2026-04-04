'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Flag, User, Building2, MessageSquare, FileUp, Tag, Edit2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import TaskStatusBadge from '@/components/ui/TaskStatusBadge'
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge'
import TaskAssigneesStack from '@/components/ui/TaskAssigneesStack'
import TaskCommentForm from '@/components/forms/TaskCommentForm'
import { TaskCommentInput } from '@/components/TaskCommentInput'
import { TaskCommentDisplay } from '@/components/TaskCommentDisplay'
import { TaskAttachmentDisplay } from '@/components/TaskAttachmentDisplay'
import { TaskAttachmentUpload } from '@/components/TaskAttachmentUpload'
import { TaskActivityFeed } from '@/components/TaskActivityFeed'
import { TaskDependencyViewer } from '@/components/TaskDependencyViewer'
import { TaskHealthBadge } from '@/components/TaskHealthBadge'
import TaskRecurrenceDisplay from '@/components/TaskRecurrenceDisplay'
import RecurrenceFormModal from '@/components/RecurrenceFormModal'
import { getTaskComments } from '@/actions/task-comments'
import { getTaskAttachments } from '@/actions/task-attachments'
import TaskEditModal from './TaskEditModal'
import { formatDueDate, isTaskOverdue } from '@/lib/task-utils'
import { completeTask, cancelTask, deleteTask, assignTask, removeAssignee, getTask } from '@/actions/tasks'
import type { TaskWithRelations, TaskStatus } from '@/lib/types'

interface Props {
  task: TaskWithRelations
  onClose: () => void
  onTaskUpdated: (task: TaskWithRelations) => void
  onTaskDeleted: (taskId: string) => void
  companies: { id: string; name: string }[]
  teamMembers: { id: string; name: string; color: string }[]
  allLabels: { id: string; name: string; color: string | null }[]
  currentUserId: string
}

export default function TaskDetailModal({
  task,
  onClose,
  onTaskDeleted,
  onTaskUpdated,
  teamMembers,
  companies,
  currentUserId,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false)
  const [currentTask, setCurrentTask] = useState(task)
  const [comments, setComments] = useState(task.comments || [])
  const [attachments, setAttachments] = useState(task.attachments || [])
  const [loadingComments, setLoadingComments] = useState(false)
  const [loadingAttachments, setLoadingAttachments] = useState(false)

  // Load comments and attachments on mount
  useEffect(() => {
    const loadData = async () => {
      setLoadingComments(true)
      setLoadingAttachments(true)

      const commentsResult = await getTaskComments(task.id)
      if (!commentsResult.error && commentsResult.comments) {
        setComments(commentsResult.comments)
      }

      const attachmentsResult = await getTaskAttachments(task.id)
      if (!attachmentsResult.error && attachmentsResult.attachments) {
        setAttachments(attachmentsResult.attachments)
      }

      setLoadingComments(false)
      setLoadingAttachments(false)
    }
    loadData()
  }, [task.id])

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

  const handleTaskUpdated = (updatedTask: TaskWithRelations) => {
    setCurrentTask(updatedTask)
    onTaskUpdated(updatedTask)
    setShowEditModal(false)
  }

  const handleRecurrenceUpdated = async () => {
    // Refresh the task to get updated recurrence info
    const result = await getTask(task.id)
    if (!result.error && result.data) {
      setCurrentTask(result.data as TaskWithRelations)
    }
  }

  const handleCommentAdded = async () => {
    // Reload comments when a new one is added
    const result = await getTaskComments(task.id)
    if (!result.error && result.comments) {
      setComments(result.comments)
    }
  }

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const handleCommentUpdated = (updatedComment: any) => {
    setComments(prev =>
      prev.map(c => (c.id === updatedComment.id ? updatedComment : c))
    )
  }

  const handleAttachmentAdded = async () => {
    // Reload attachments when a new one is added
    const result = await getTaskAttachments(task.id)
    if (!result.error && result.attachments) {
      setAttachments(result.attachments)
    }
  }

  const handleAttachmentDeleted = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId))
  }

  const overdue = isTaskOverdue(currentTask)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white truncate pr-4">
            {currentTask.title}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-slate-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Edit task"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-slate-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Health Score */}
          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <TaskHealthBadge task={currentTask} showDetails={true} />
          </div>

          {/* Status Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Status</h3>
            <div className="flex items-center gap-3">
              <TaskStatusBadge status={currentTask.status} />
              <div className="flex gap-2">
                {currentTask.status !== 'Done' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleComplete}
                    loading={isCompleting}
                  >
                    Mark Complete
                  </Button>
                )}
                {currentTask.status !== 'Cancelled' && currentTask.status !== 'Done' && (
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
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                <Flag size={16} />
                Priority
              </label>
              <TaskPriorityBadge priority={currentTask.priority} size="md" />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                <Calendar size={16} />
                Due Date
              </label>
              {currentTask.due_date ? (
                <div>
                  <p className="text-sm text-neutral-900 dark:text-white">
                    {new Date(currentTask.due_date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className={`text-xs font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-500'}`}>
                    {formatDueDate(currentTask)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-600">No due date</p>
              )}
            </div>
          </div>

          {/* Recurrence */}
          {currentTask.is_recurring && currentTask.recurrence_rule ? (
            <TaskRecurrenceDisplay
              rule={currentTask.recurrence_rule}
              taskId={currentTask.id}
              onRuleUpdated={handleRecurrenceUpdated}
              onEdit={() => setShowRecurrenceModal(true)}
            />
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowRecurrenceModal(true)}
              className="w-full"
            >
              Make Task Recurring
            </Button>
          )}

          {/* Assignees */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
              <User size={16} />
              Assignees
            </label>
            {currentTask.assignees && currentTask.assignees.length > 0 ? (
              <div className="space-y-2">
                <TaskAssigneesStack assignees={currentTask.assignees} maxDisplay={5} />
                <div className="flex flex-wrap gap-2">
                  {currentTask.assignees.map(assignee => (
                    <div
                      key={assignee.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800"
                    >
                      <span className="text-sm text-neutral-900 dark:text-white">
                        {assignee.team_member?.name}
                      </span>
                      <button
                        onClick={() => handleRemoveAssignee(assignee.assigned_to)}
                        className="text-neutral-500 hover:text-neutral-700 dark:hover:text-slate-300"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-600">No assignees</p>
            )}

            <div className="pt-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssign(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="text-sm px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
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

          {/* Linked Entities */}
          {(currentTask.company || currentTask.pipeline_deal || currentTask.contact) && (
            <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-500 uppercase">Related Items</p>
              <div className="space-y-2">
                {currentTask.company && (
                  <a
                    href={`/companies/${currentTask.company.id}`}
                    className="block p-2 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 hover:border-gold-200 dark:hover:border-primary-500 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-neutral-500" />
                        <div>
                          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-500">Company</p>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">{currentTask.company.name}</p>
                        </div>
                      </div>
                      <span className="text-xs text-neutral-500">→</span>
                    </div>
                  </a>
                )}
                {currentTask.pipeline_deal && (
                  <a
                    href="/pipeline"
                    className="block p-2 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 hover:border-gold-200 dark:hover:border-primary-500 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-neutral-500" />
                        <div>
                          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-500">Deal</p>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">{currentTask.pipeline_deal.name}</p>
                        </div>
                      </div>
                      <span className="text-xs text-neutral-500">→</span>
                    </div>
                  </a>
                )}
                {currentTask.contact && (
                  <a
                    href="/contacts"
                    className="block p-2 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 hover:border-gold-200 dark:hover:border-primary-500 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-neutral-500" />
                        <div>
                          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-500">Contact</p>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">{currentTask.contact.name}</p>
                        </div>
                      </div>
                      <span className="text-xs text-neutral-500">→</span>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {currentTask.description && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-neutral-900 dark:text-white">
                Description
              </label>
              <p className="text-sm text-neutral-700 dark:text-neutral-500 whitespace-pre-wrap">
                {currentTask.description}
              </p>
            </div>
          )}

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
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

          {/* Dependencies */}
          <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-500 uppercase">Dependencies</p>
            <TaskDependencyViewer taskId={task.id} onTaskClick={(id) => {}} />
          </div>

          {/* Attachments Section */}
          <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
              <FileUp size={16} />
              Attachments ({attachments.length})
            </label>

            {/* Upload Area */}
            <TaskAttachmentUpload taskId={task.id} onAttachmentAdded={handleAttachmentAdded} />

            {/* Attachments List */}
            {loadingAttachments ? (
              <div className="text-center py-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-600">Loading attachments...</p>
              </div>
            ) : attachments.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {attachments.map(attachment => (
                  <TaskAttachmentDisplay
                    key={attachment.id}
                    attachment={attachment}
                    currentUserId={currentUserId}
                    onDeleted={handleAttachmentDeleted}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-600 italic">No attachments yet</p>
            )}
          </div>

          {/* Comments Section */}
          <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
              <MessageSquare size={16} />
              Comments ({comments.filter(c => !c.is_activity).length})
            </label>

            {/* Comment Input */}
            <TaskCommentInput
              taskId={task.id}
              teamMembers={teamMembers}
              onCommentAdded={handleCommentAdded}
            />

            {/* Comments List */}
            {loadingComments ? (
              <div className="text-center py-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-600">Loading comments...</p>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments
                  .filter(c => !c.is_activity)
                  .map(comment => (
                    <TaskCommentDisplay
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUserId}
                      teamMembers={teamMembers}
                      onCommentDeleted={handleCommentDeleted}
                      onCommentUpdated={handleCommentUpdated}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-600 italic">No comments yet</p>
            )}
          </div>

          {/* Activity Timeline */}
          {currentTask.activities && currentTask.activities.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Activity</h4>
              <TaskActivityFeed
                activities={currentTask.activities}
                teamMembers={teamMembers}
                maxItems={8}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex justify-between">
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

      {/* Edit Modal */}
      {showEditModal && (
        <TaskEditModal
          task={currentTask}
          onClose={() => setShowEditModal(false)}
          onTaskUpdated={handleTaskUpdated}
          companies={companies}
          teamMembers={teamMembers}
        />
      )}

      {/* Recurrence Modal */}
      <RecurrenceFormModal
        open={showRecurrenceModal}
        rule={currentTask.recurrence_rule}
        taskId={currentTask.id}
        onClose={() => setShowRecurrenceModal(false)}
        onSubmit={() => {
          handleRecurrenceUpdated()
          setShowRecurrenceModal(false)
        }}
      />
    </div>
  )
}
