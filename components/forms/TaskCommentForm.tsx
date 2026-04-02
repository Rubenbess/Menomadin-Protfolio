'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import Button from '@/components/ui/Button'
import { addComment } from '@/actions/tasks'

interface Props {
  taskId: string
}

export default function TaskCommentForm({ taskId }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    setError('')

    const result = await addComment(taskId, content.trim())

    if (result.error) {
      setError(result.error)
    } else {
      setContent('')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30"
        />
        <Button
          type="submit"
          disabled={!content.trim()}
          loading={loading}
          className="p-2"
        >
          <Send size={16} />
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </form>
  )
}
