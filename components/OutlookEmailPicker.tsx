'use client'

import { useEffect, useState } from 'react'
import { Search, ExternalLink, Lock, Mail } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { attachOutlookEmailToTask } from '@/actions/task-emails'

interface GraphMessageSummary {
  id: string
  subject: string | null
  bodyPreview: string
  from: { emailAddress: { name?: string; address?: string } } | null
  receivedDateTime: string
  hasAttachments: boolean
  webLink?: string
}

interface Props {
  open: boolean
  onClose: () => void
  taskId: string
  onAttached: () => void
}

export default function OutlookEmailPicker({ open, onClose, taskId, onAttached }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [messages, setMessages] = useState<GraphMessageSummary[]>([])
  const [connected, setConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const { success, error: showError } = useToast()

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(t)
  }, [query, open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ q: debounced, limit: '25' })
    fetch(`/api/outlook/search-messages?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((data: { connected: boolean; messages: GraphMessageSummary[] }) => {
        if (cancelled) return
        setConnected(data.connected)
        setMessages(data.messages ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setConnected(null)
        setMessages([])
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [debounced, open])

  async function handleAttach(message: GraphMessageSummary) {
    setAttachingId(message.id)
    const result = await attachOutlookEmailToTask({
      taskId,
      messageId: message.id,
      isPrivate,
    })
    setAttachingId(null)

    if (result.error) {
      showError(result.error)
      return
    }
    success(`Attached "${message.subject || '(no subject)'}"`)
    onAttached()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Attach email from Outlook">
      <div className="space-y-4">
        {connected === false && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Outlook not connected</p>
            <p className="mt-1 text-amber-800">
              Connect your Outlook in{' '}
              <a
                href="/settings/email-scanner"
                className="font-medium underline hover:text-amber-700"
              >
                Settings → Email Scanner
              </a>{' '}
              to search and attach emails from your inbox.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject, sender, or body…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            disabled={connected === false}
          />
        </div>

        {/* Privacy toggle */}
        <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <Lock size={12} />
          Attach as private (only you and task assignees can see it)
        </label>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto -mx-2">
          {loading && (
            <p className="text-sm text-neutral-500 py-6 text-center">Loading…</p>
          )}
          {!loading && connected && messages.length === 0 && (
            <p className="text-sm text-neutral-500 py-6 text-center">
              {debounced ? 'No matching emails.' : 'Inbox is empty.'}
            </p>
          )}
          {!loading &&
            messages.map((m) => (
              <button
                key={m.id}
                onClick={() => handleAttach(m)}
                disabled={attachingId !== null}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-start gap-2">
                  <Mail size={14} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {m.subject || '(no subject)'}
                      </p>
                      <span className="text-xs text-neutral-500 flex-shrink-0">
                        {new Date(m.receivedDateTime).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 truncate">
                      {m.from?.emailAddress?.name ?? m.from?.emailAddress?.address ?? 'Unknown sender'}
                    </p>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {m.bodyPreview}
                    </p>
                  </div>
                  {m.webLink && (
                    <a
                      href={m.webLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-primary-600 mt-0.5"
                      title="Open in Outlook"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                {attachingId === m.id && (
                  <p className="text-xs text-primary-600 mt-1 ml-6">Attaching…</p>
                )}
              </button>
            ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-neutral-100">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
