'use client'

import { useState } from 'react'
import { Trash2, Edit2 } from 'lucide-react'
import { deleteComment, updateComment } from '@/actions/task-comments'
import { useToast } from '@/hooks/useToast'
import type { TaskComment, TeamMember } from '@/lib/types'

interface Props {
  comment: TaskComment & { author?: TeamMember }
  currentUserId: string
  teamMembers: { id: string; name: string; color: string }[]
  onCommentDeleted: (commentId: string) => void
  onCommentUpdated: (comment: TaskComment) => void
}

export function TaskCommentDisplay({
  comment,
  currentUserId,
  teamMembers,
  onCommentDeleted,
  onCommentUpdated,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(comment.content)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { success, error: showError } = useToast()

  const isOwner = comment.author_id === currentUserId

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return

    setIsDeleting(true)
    const result = await deleteComment(comment.id)

    if (result.error) {
      showError(result.error)
    } else {
      success('Comment deleted')
      onCommentDeleted(comment.id)
    }
    setIsDeleting(false)
  }

  const handleSave = async () => {
    if (!editedContent.trim()) return

    setIsSaving(true)
    const result = await updateComment(comment.id, editedContent.trim())

    if (result.error) {
      showError(result.error)
    } else {
      success('Comment updated')
      onCommentUpdated({ ...comment, content: editedContent.trim() })
      setIsEditing(false)
    }
    setIsSaving(false)
  }

  // Parse mentions in content and render with highlight
  const renderContent = (text: string) => {
    const mentionRegex = /@([a-zA-Z0-9\s]+)\(([a-z0-9-]+)\)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0

    let match
    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      // Find the mentioned user
      const userId = match[2]
      const user = teamMembers.find(m => m.id === userId)

      // Add mention as highlighted element
      parts.push(
        <span
          key={match.index}
          className="inline-block px-1.5 py-0.5 rounded font-medium text-white text-sm"
          style={{ backgroundColor: user?.color || '#6366f1' }}
        >
          @{match[1]}
        </span>
      )

      lastIndex = mentionRegex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  return (
    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: comment.author?.color || '#6366f1' }}
          >
            {comment.author?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              {comment.author?.name || 'Unknown'}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              {new Date(comment.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: new Date(comment.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Actions */}
        {isOwner && (
          <div className="flex gap-1">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded transition-colors"
              title="Edit comment"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors disabled:opacity-50"
              title="Delete comment"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setEditedContent(comment.content)
              }}
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-neutral-700 dark:text-neutral-400 whitespace-pre-wrap">
          {renderContent(comment.content)}
        </p>
      )}
    </div>
  )
}
