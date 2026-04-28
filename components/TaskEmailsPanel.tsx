'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, Plus, Upload } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import OutlookEmailPicker from '@/components/OutlookEmailPicker'
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
  const [pickerOpen, setPickerOpen] = useState(false)
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
      const r = await attachEmailFileToTask(fd)
      if (r.error) {
        showError(`${file.name}: ${r.error}`)
        continue
      }
      success(`Attached "${r.data?.subject || file.name}"`)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    await reload()
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
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPickerOpen(true)}
          type="button"
        >
          <Plus size={14} />
          Attach from Outlook
        </Button>
        <span className="text-xs text-neutral-400">or drop a .eml / .msg file below</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-3 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:border-primary-400 dark:hover:border-primary-500'
        }`}
      >
        <div className="flex items-center justify-center gap-2 py-1">
          <Upload size={14} className="text-neutral-500" />
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {uploading ? 'Uploading…' : 'Drop .eml / .msg here, or click to browse'}
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

      <OutlookEmailPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        taskId={taskId}
        onAttached={reload}
      />
    </div>
  )
}
