'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'

interface Props {
  isOpen: boolean
  imageUrl: string
  fileName: string
  onClose: () => void
}

export default function ImagePreviewModal({ isOpen, imageUrl, fileName, onClose }: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-white text-sm font-medium truncate flex-1">{fileName}</p>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              download={fileName}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Download image"
            >
              <Download size={20} className="text-white" />
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Close preview"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center bg-black/40 rounded-lg overflow-hidden">
          {!error ? (
            <>
              {isLoading && (
                <div className="absolute">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
              <img
                src={imageUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false)
                  setError(true)
                }}
              />
            </>
          ) : (
            <div className="text-center">
              <p className="text-white/60 text-sm">Failed to load image</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 text-white/60 text-xs text-center">
          Click outside or press Escape to close
        </div>
      </div>
    </div>
  )
}
