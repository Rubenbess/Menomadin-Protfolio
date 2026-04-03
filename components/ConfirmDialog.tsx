'use client'

import { useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { AlertCircle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  description?: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
  isLoading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Handle Escape key
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter' && !isLoading) {
        handleConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isLoading, onCancel])

  const handleConfirm = async () => {
    try {
      await Promise.resolve(onConfirm())
    } catch (error) {
      console.error('Confirm dialog error:', error)
    }
  }

  return (
    <Modal open={open} onClose={onCancel} title="">
      <div className="text-center">
        {isDangerous && (
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
        )}

        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
          {title}
        </h2>

        <p className="text-neutral-700 dark:text-neutral-500 mb-1">
          {message}
        </p>

        {description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-600">
            {description}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={isDangerous ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={isLoading}
            disabled={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
