'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Trash2, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { deleteDocument } from '@/actions/documents'
import Button from '@/components/ui/Button'
import type { Document } from '@/lib/types'

interface Props {
  companyId: string
  documents: Document[]
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['xls', 'xlsx', 'csv'].includes(ext ?? '')) return '📊'
  if (['pdf'].includes(ext ?? '')) return '📄'
  if (['ppt', 'pptx'].includes(ext ?? '')) return '📑'
  if (['doc', 'docx'].includes(ext ?? '')) return '📝'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext ?? '')) return '🖼️'
  return '📎'
}

export default function DocumentUpload({ companyId, documents }: Props) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [extracting, setExtracting] = useState<string | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const filePath = `${companyId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, file_url: urlData.publicUrl, file_name: file.name, type: file.type }),
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

  async function handleExtract(doc: Document) {
    setExtracting(doc.id)
    setExtractError(null)
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: doc.id, file_url: doc.file_url, file_name: doc.file_name, file_type: doc.type }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Extraction failed')
      setExpanded(doc.id)
      router.refresh()
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setExtracting(null)
    }
  }

  async function handleDelete(id: string, fileUrl: string) {
    if (!confirm('Delete this document?')) return
    const supabase = createClient()
    const url = new URL(fileUrl)
    const path = url.pathname.split('/documents/')[1]
    if (path) await supabase.storage.from('documents').remove([path])
    await deleteDocument(id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input ref={inputRef} type="file" onChange={handleUpload} className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg" />
        <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
          <Upload size={14} />
          {uploading ? 'Uploading…' : 'Upload document'}
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {extractError && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200">{extractError}</p>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-neutral-500">No documents yet.</p>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="rounded-lg border border-neutral-200 overflow-hidden">
              {/* Document row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-neutral-50/60 transition-colors">
                <span className="text-lg flex-shrink-0">{fileIcon(doc.file_name)}</span>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-sm font-medium text-neutral-800 hover:text-primary-500 truncate transition-colors">
                  {doc.file_name}
                </a>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* AI extract button */}
                  <button
                    onClick={() => doc.extracted_data ? setExpanded(expanded === doc.id ? null : doc.id) : handleExtract(doc)}
                    disabled={extracting === doc.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      doc.extracted_data
                        ? 'text-primary-500 bg-gold-50 hover:bg-gold-100'
                        : 'text-neutral-600 hover:text-primary-500 hover:bg-gold-50'
                    }`}
                    title={doc.extracted_data ? 'View extracted data' : 'Extract with AI'}
                  >
                    {extracting === doc.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Sparkles size={12} />
                    }
                    {doc.extracted_data
                      ? (expanded === doc.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
                      : extracting === doc.id ? 'Extracting…' : 'Extract'
                    }
                  </button>
                  <button onClick={() => handleDelete(doc.id, doc.file_url)}
                    className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Extracted data panel */}
              {doc.extracted_data && expanded === doc.id && (
                <div className="border-t border-neutral-200 bg-neutral-50/60 px-4 py-4 space-y-4">
                  {doc.extracted_data.summary && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Summary</p>
                      <p className="text-sm text-neutral-800 leading-relaxed">{doc.extracted_data.summary}</p>
                    </div>
                  )}

                  {doc.extracted_data.metrics && Object.keys(doc.extracted_data.metrics).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Extracted Metrics</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(doc.extracted_data.metrics).map(([k, v]) => (
                          <div key={k} className="bg-white rounded-lg px-3 py-2 ring-1 ring-slate-200">
                            <p className="text-xs text-neutral-500 mb-0.5">{k}</p>
                            <p className="text-sm font-semibold text-neutral-900">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {doc.extracted_data.key_points && doc.extracted_data.key_points.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Key Points</p>
                      <ul className="space-y-1.5">
                        {doc.extracted_data.key_points.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-neutral-800">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold-300 flex-shrink-0" />
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => handleExtract(doc)}
                    disabled={extracting === doc.id}
                    className="text-xs text-neutral-500 hover:text-primary-500 transition-colors"
                  >
                    Re-extract
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
