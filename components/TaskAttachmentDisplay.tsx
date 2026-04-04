'use client'

import { useState } from 'react'
import { Download, Trash2, FileText, Image, File } from 'lucide-react'
import { deleteTaskAttachment } from '@/actions/task-attachments'
import { useToast } from '@/hooks/useToast'
import type { TaskAttachment } from '@/lib/types'

interface Props {
  attachment: TaskAttachment
  currentUserId: string
  uploadedByName?: string
  onDeleted: (id: string) => void
}

export function TaskAttachmentDisplay({ attachment, currentUserId, uploadedByName, onDeleted }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { success, error: showError } = useToast()

  const handleDelete = async () => {
    if (!window.confirm('Delete this attachment?')) return

    setIsDeleting(true)
    const result = await deleteTaskAttachment(attachment.id)

    if (result.error) {
      showError(result.error)
    } else {
      success('Attachment deleted')
      onDeleted(attachment.id)
    }
    setIsDeleting(false)
  }

  const getFileIcon = () => {
    const type = attachment.file_name.split('.').pop()?.toLowerCase() || ''
    const mimeType = attachment.file_url?.split('.').pop()?.toLowerCase() || ''

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
      return <Image size={16} />
    } else if (['pdf'].includes(type)) {
      return <FileText size={16} />
    }
    return <File size={16} />
  }

  const getFilePreview = () => {
    const type = attachment.file_name.split('.').pop()?.toLowerCase() || ''
    if (['jpg', 'jpeg', 'png', 'gif'].includes(type)) {
      return (
        <div className="mt-2 relative group">
          <img
            src={attachment.file_url}
            alt={attachment.file_name}
            className="max-w-xs max-h-48 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer"
            onClick={() => window.open(attachment.file_url, '_blank')}
          />
          <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-white text-sm font-medium">Click to enlarge</p>
          </div>
        </div>
      )
    }
    return null
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate" title={attachment.file_name}>
              {attachment.file_name}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              {formatFileSize(attachment.file_size)} •{' '}
              {new Date(attachment.created_at).toLocaleDateString()}
            </p>
            {uploadedByName && (
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                Uploaded by {uploadedByName}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <a
            href={attachment.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded transition-colors"
            title="Download file"
          >
            <Download size={16} />
          </a>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors disabled:opacity-50"
            title="Delete attachment"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {getFilePreview()}
    </div>
  )
}
