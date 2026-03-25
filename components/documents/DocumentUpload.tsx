'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { deleteDocument } from '@/actions/documents'
import Button from '@/components/ui/Button'
import type { Document } from '@/lib/types'

interface Props {
  companyId: string
  documents: Document[]
}

export default function DocumentUpload({ companyId, documents }: Props) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const supabase = createClient()
      const filePath = `${companyId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          type: file.type,
        }),
      })

      if (!res.ok) throw new Error('Failed to save document')

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(id: string, fileUrl: string) {
    if (!confirm('Delete this document?')) return

    const supabase = createClient()
    // Extract path from URL
    const url = new URL(fileUrl)
    const path = url.pathname.split('/documents/')[1]
    if (path) {
      await supabase.storage.from('documents').remove([path])
    }
    await deleteDocument(id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div>
        <input
          ref={inputRef}
          type="file"
          onChange={handleUpload}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} />
          {uploading ? 'Uploading…' : 'Upload document'}
        </Button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400">No documents yet.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-indigo-600 truncate"
              >
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                {doc.file_name}
              </a>
              <button
                onClick={() => handleDelete(doc.id, doc.file_url)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
