'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, Upload } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import TaskEmailAttachmentDisplay from '@/components/TaskEmailAttachmentDisplay'
import {
  attachEmailFileToTask,
  getTaskEmailAttachments,
} from '@/actions/task-emails'
import type { TaskEmailAttachment } from '@/lib/types'

interface Props {
  taskId: string
  currentUserId: string
}

export default function TaskEmailsPanel({ taskId, currentUserId }: Props) {
  const [attachments, setAttachments] = useState<TaskEmailAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPrivate, setUploadPrivate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { success, error: showError } = useToast()

  async function reload() {
    const r = await getTaskEmailAttachments(taskId)
    if (r.error) {
      showError(r.error)
      return
    }
    setAttachments(r.attachments)
  }

  useEffect(() => {
    setLoading(true)
    reload().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files)
    if (list.length === 0) return
    setUploading(true)
    try {
      for (const file of list) {
        const lower = file.name.toLowerCase()
        if (!lower.endsWith('.eml') && !lower.endsWith('.msg')) {
          showError(`${file.name}: only .eml and .msg are supported`)
          continue
        }
        const fd = new FormData()
        fd.append('taskId', taskId)
        fd.append('file', file)
        fd.append('isPrivate', uploadPrivate ? 'true' : 'false')
        try {
          const r = await attachEmailFileToTask(fd)
          if (r.error) {
            showError(`${file.name}: ${r.error}`)
            continue
          }
          success(`Attached "${r.data?.subject || file.name}"`)
        } catch (e) {
          // Server action threw (e.g. bundle error). Surface it instead of
          // leaving the UI stuck on "Uploading…".
          const msg = e instanceof Error ? e.message : 'Upload failed'
          console.error('[TaskEmailsPanel] upload threw', e)
          showError(`${file.name}: ${msg}`)
        }
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await reload()
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }
  function handleDragLeave() {
    setIsDragging(false)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:border-primary-400 dark:hover:border-primary-500'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-1.5 py-1">
          <Upload size={18} className="text-neutral-500" />
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {uploading ? 'Uploading…' : 'Drop .eml or .msg here, or click to browse'}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            In Outlook: right-click an email → <span className="font-medium">Save As</span>
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".eml,.msg,message/rfc822,application/vnd.ms-outlook"
          onChange={(e) => e.currentTarget.files && handleFiles(e.currentTarget.files)}
          className="hidden"
        />
      </div>

      {/* Privacy default for uploads */}
      <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
        <input
          type="checkbox"
          checked={uploadPrivate}
          onChange={(e) => setUploadPrivate(e.target.checked)}
          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
        />
        Mark uploaded files as private by default
      </label>

      {/* List */}
      {loading ? (
        <p className="text-sm text-neutral-500 italic">Loading emails…</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-600 italic flex items-center gap-2">
          <Mail size={14} />
          No emails attached yet
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {attachments.map((a) => (
            <TaskEmailAttachmentDisplay
              key={a.id}
              attachment={a}
              currentUserId={currentUserId}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}
