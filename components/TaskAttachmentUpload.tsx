'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { uploadTaskAttachment } from '@/actions/task-attachments'
import { useToast } from '@/hooks/useToast'

interface Props {
  taskId: string
  onAttachmentAdded: () => void
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export function TaskAttachmentUpload({ taskId, onAttachmentAdded }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { success, error: showError } = useToast()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files)
    setUploading(true)

    for (const file of fileArray) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        showError(`${file.name} - File type not allowed (PDF, images, Office docs only)`)
        continue
      }

      // Validate file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        showError(`${file.name} - File too large (max 50MB)`)
        continue
      }

      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

        // For now, we'll simulate upload since the backend action expects fileUrl
        // In a real implementation, you'd upload to storage first, get the URL, then call the action
        const mockUrl = URL.createObjectURL(file)

        const result = await uploadTaskAttachment(taskId, file.name, mockUrl, file.size)

        if (result.error) {
          showError(`${file.name} - ${result.error}`)
        } else {
          success(`${file.name} uploaded`)
          onAttachmentAdded()
        }

        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[file.name]
          return newProgress
        })
      } catch (error) {
        showError(`${file.name} - Upload failed`)
      }
    }

    setUploading(false)
    setIsDragging(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:border-primary-400 dark:hover:border-primary-500'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center gap-2 py-2">
          <Upload size={24} className="text-neutral-600 dark:text-neutral-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Drag files here or click to browse
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              PDF, images, or Office documents (max 50MB)
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.currentTarget.files && handleFiles(e.currentTarget.files)}
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                  {fileName}
                </p>
                <p className="text-xs text-neutral-500">{Math.round(progress)}%</p>
              </div>
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
