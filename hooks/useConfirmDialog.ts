import { useState } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  description?: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
}

export function useConfirmDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
  })
  const [onConfirmCallback, setOnConfirmCallback] = useState<() => Promise<void> | void>(() => {})

  const confirm = (opts: ConfirmOptions, onConfirm: () => Promise<void> | void) => {
    setOptions(opts)
    setOnConfirmCallback(() => onConfirm)
    setOpen(true)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await Promise.resolve(onConfirmCallback())
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
    setLoading(false)
  }

  return {
    open,
    loading,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  }
}
