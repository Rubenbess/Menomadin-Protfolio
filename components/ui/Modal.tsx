'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const [visible, setVisible] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      setClosing(false)
    } else if (visible) {
      setClosing(true)
      const t = setTimeout(() => setVisible(false), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!visible) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/50"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative bg-white rounded-lg shadow-2xl ring-1 ring-black/[0.08] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            <X size={17} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
