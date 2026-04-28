'use client'

import { useState } from 'react'
import { Mail, Lock, Globe, Trash2, ChevronDown, ChevronRight, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import {
  detachEmailFromTask,
  setEmailAttachmentPrivacy,
} from '@/actions/task-emails'
import type { TaskEmailAttachment } from '@/lib/types'

interface Props {
  attachment: TaskEmailAttachment
  currentUserId: string
  onChanged: () => void
}

export default function TaskEmailAttachmentDisplay({
  attachment,
  currentUserId,
  onChanged,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const { success, error: showError } = useToast()

  const isOwner = attachment.attached_by === currentUserId

  async function handleDelete() {
    if (!confirm('Remove this email from the task?')) return
    setBusy(true)
    const r = await detachEmailFromTask(attachment.id)
    setBusy(false)
    if (r.error) {
      showError(r.error)
      return
    }
    success('Email removed')
    onChanged()
  }

  async function handleTogglePrivacy() {
    setBusy(true)
    const r = await setEmailAttachmentPrivacy(attachment.id, !attachment.is_private)
    setBusy(false)
    if (r.error) {
      showError(r.error)
      return
    }
    success(attachment.is_private ? 'Made public' : 'Made private')
    onChanged()
  }

  const dateStr = attachment.received_at
    ? new Date(attachment.received_at).toLocaleString()
    : new Date(attachment.attached_at).toLocaleString()

  const senderLabel =
    attachment.from_name ||
    attachment.from_email ||
    'Unknown sender'

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 overflow-hidden">
      <div className="flex items-start gap-2 p-3">
        <Mail size={15} className="text-primary-600 mt-0.5 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-left w-full group"
          >
            {expanded ? (
              <ChevronDown size={13} className="text-neutral-400 flex-shrink-0" />
            ) : (
              <ChevronRight size={13} className="text-neutral-400 flex-shrink-0" />
            )}
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
              {attachment.subject || '(no subject)'}
            </p>
          </button>
          <div className="flex items-center gap-2 mt-0.5 ml-4 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="truncate">{senderLabel}</span>
            <span className="text-neutral-300 dark:text-neutral-600">•</span>
            <span className="flex items-center gap-1 flex-shrink-0">
              <Calendar size={10} />
              {dateStr}
            </span>
            {attachment.is_private && (
              <>
                <span className="text-neutral-300 dark:text-neutral-600">•</span>
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 flex-shrink-0">
                  <Lock size={10} />
                  Private
                </span>
              </>
            )}
          </div>
          {!expanded && attachment.body_preview && (
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 ml-4 truncate">
              {attachment.body_preview}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isOwner && (
            <>
              <button
                onClick={handleTogglePrivacy}
                disabled={busy}
                className="p-1.5 text-neutral-500 hover:text-amber-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-50"
                title={attachment.is_private ? 'Make public' : 'Make private'}
              >
                {attachment.is_private ? <Globe size={13} /> : <Lock size={13} />}
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-50"
                title="Remove email"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 p-4 space-y-2 text-xs">
          <RecipientLine label="From" rows={[{
            name: attachment.from_name,
            email: attachment.from_email,
          }]} />
          <RecipientLine label="To" rows={attachment.to_recipients} />
          {attachment.cc_recipients?.length > 0 && (
            <RecipientLine label="Cc" rows={attachment.cc_recipients} />
          )}
          <div className="pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-700">
            {attachment.body_html ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert text-xs text-neutral-800 dark:text-neutral-200 [&_a]:text-primary-600 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: attachment.body_html }}
              />
            ) : attachment.body_text ? (
              <pre className="whitespace-pre-wrap font-sans text-neutral-800 dark:text-neutral-200">
                {attachment.body_text}
              </pre>
            ) : (
              <p className="italic text-neutral-500">No body content.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RecipientLine({
  label,
  rows,
}: {
  label: string
  rows: { name: string | null; email: string | null }[]
}) {
  if (!rows || rows.length === 0) return null
  return (
    <div className="flex gap-2">
      <span className="font-medium text-neutral-600 dark:text-neutral-400 w-10 flex-shrink-0">
        {label}:
      </span>
      <span className="text-neutral-800 dark:text-neutral-200 flex-1 break-words">
        {rows
          .filter((r) => r.email || r.name)
          .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
          .join(', ')}
      </span>
    </div>
  )
}
