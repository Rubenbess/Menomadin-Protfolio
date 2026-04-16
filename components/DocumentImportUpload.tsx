'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { createGlobalDocument } from '@/actions/global-documents'
import type { DocumentCategory } from '@/lib/types'

const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx'
const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx']

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx'].includes(ext ?? '')) return '📝'
  if (['ppt', 'pptx'].includes(ext ?? '')) return '📑'
  return '📎'
}

function guessCategory(name: string): DocumentCategory {
  const lower = name.toLowerCase()
  if (lower.includes('term') || lower.includes('sheet')) return 'Term Sheet'
  if (lower.includes('sha') || lower.includes('shareholders')) return 'SHA'
  if (lower.includes('invest')) return 'Investment Agreement'
  if (lower.includes('board') || lower.includes('minute')) return 'Board Minutes'
  if (lower.includes('financ') || lower.includes('p&l') || lower.includes('balance')) return 'Financials'
  if (lower.includes('pitch') || lower.includes('deck')) return 'Pitch Deck'
  if (lower.includes('legal') || lower.includes('contract') || lower.includes('agreement')) return 'Legal'
  return 'Other'
}

interface UploadedFile {
  name: string
  url: string
  category: DocumentCategory
}

export function DocumentImportUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploaded, setUploaded] = useState<UploadedFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const valid = fileArray.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      return ACCEPTED_EXTENSIONS.includes(ext)
    })

    if (valid.length === 0) {
      setError('Please upload PDF, Word (.doc/.docx), or PowerPoint (.ppt/.pptx) files')
      return
    }
    if (valid.length < fileArray.length) {
      setError(`${fileArray.length - valid.length} file(s) skipped — unsupported format`)
    } else {
      setError(null)
    }

    setIsUploading(true)
    const supabase = createClient()
    const newUploaded: UploadedFile[] = []

    for (const file of valid) {
      try {
        const filePath = `global/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
        const category = guessCategory(file.name)

        await createGlobalDocument({
          company_id: null,
          file_url: urlData.publicUrl,
          file_name: file.name,
          category,
          doc_date: new Date().toISOString().split('T')[0],
          notes: null,
        })

        newUploaded.push({ name: file.name, url: urlData.publicUrl, category })
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to upload ${file.name}`)
      }
    }

    setUploaded(prev => [...prev, ...newUploaded])
    setIsUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-10 transition-colors ${
          isDragging
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
            : 'border-neutral-300 dark:border-neutral-600 hover:border-violet-400'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <FileText
            size={32}
            className={isDragging ? 'text-violet-600' : 'text-neutral-500'}
          />
          <div className="text-center">
            <p className="font-medium text-neutral-900 dark:text-white">
              Drag and drop documents here
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-500 mt-1">
              PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx) — multiple files supported
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            onChange={handleChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="mt-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
          >
            {isUploading ? 'Uploading…' : 'Select Files'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Uploaded files */}
      {uploaded.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-400">
            Uploaded to Document Vault ({uploaded.length})
          </p>
          {uploaded.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
              <span className="text-lg">{fileIcon(f.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{f.name}</p>
                <p className="text-xs text-neutral-500">{f.category}</p>
              </div>
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 hover:underline flex-shrink-0"
              >
                View →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
