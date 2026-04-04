'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, AtSign } from 'lucide-react'
import { addCommentToTask } from '@/actions/task-comments'
import { useToast } from '@/hooks/useToast'

interface Props {
  taskId: string
  teamMembers: { id: string; name: string; color: string }[]
  onCommentAdded: () => void
}

export function TaskCommentInput({ taskId, teamMembers, onCommentAdded }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([])
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState<typeof teamMembers>([])
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { success, error: showError } = useToast()

  // Handle mention suggestions
  useEffect(() => {
    const lastAtIndex = content.lastIndexOf('@')
    if (lastAtIndex === -1 || lastAtIndex >= cursorPosition) {
      setShowMentionSuggestions(false)
      return
    }

    const afterAt = content.substring(lastAtIndex + 1, cursorPosition)
    if (afterAt.includes(' ') || afterAt.includes('\n')) {
      setShowMentionSuggestions(false)
      return
    }

    const query = afterAt.toLowerCase()
    const suggestions = teamMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(query) &&
        !mentionedUserIds.includes(m.id)
    )

    setShowMentionSuggestions(suggestions.length > 0)
    setMentionSuggestions(suggestions)
  }, [content, cursorPosition, teamMembers, mentionedUserIds])

  const handleMentionSelect = (member: typeof teamMembers[0]) => {
    const lastAtIndex = content.lastIndexOf('@')
    const beforeAt = content.substring(0, lastAtIndex)
    const afterCursor = content.substring(cursorPosition)

    const newContent = `${beforeAt}@${member.name} ${afterCursor}`
    setContent(newContent)
    setMentionedUserIds([...new Set([...mentionedUserIds, member.id])])
    setShowMentionSuggestions(false)

    if (textareaRef.current) {
      const newPosition = lastAtIndex + member.name.length + 2
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(newPosition, newPosition)
        textareaRef.current?.focus()
      }, 0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      showError('Comment cannot be empty')
      return
    }

    setLoading(true)
    try {
      const result = await addCommentToTask(taskId, content, mentionedUserIds)

      if (result.error) {
        showError(result.error)
        setLoading(false)
        return
      }

      success('Comment added')
      setContent('')
      setMentionedUserIds([])
      onCommentAdded()
    } catch (err) {
      showError('Failed to add comment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            setCursorPosition(e.currentTarget.selectionStart)
          }}
          onMouseUp={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              handleSubmit(e as any)
            }
          }}
          placeholder="Add a comment... Type @ to mention someone"
          className="field-input resize-none h-24"
        />

        {/* Mention suggestions dropdown */}
        {showMentionSuggestions && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-0 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10">
            <div className="max-h-48 overflow-y-auto">
              {mentionSuggestions.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMentionSelect(member)}
                  className="w-full text-left px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: member.color }}
                  />
                  <span className="text-sm text-neutral-900 dark:text-neutral-50">
                    {member.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mentioned users display */}
      {mentionedUserIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mentionedUserIds.map((userId) => {
            const member = teamMembers.find((m) => m.id === userId)
            return member ? (
              <div
                key={userId}
                className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm"
              >
                <span>{member.name}</span>
                <button
                  onClick={() =>
                    setMentionedUserIds(
                      mentionedUserIds.filter((id) => id !== userId)
                    )
                  }
                  className="hover:opacity-70 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ) : null
          })}
        </div>
      )}

      {/* Submit button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Ctrl+Enter to submit
        </p>
        <button
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={16} />
          {loading ? 'Posting...' : 'Comment'}
        </button>
      </div>
    </div>
  )
}
