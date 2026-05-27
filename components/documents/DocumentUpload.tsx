'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Trash2, Sparkles, ChevronDown, ChevronUp, Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { deleteDocument } from '@/actions/documents'
import Button from '@/components/ui/Button'
import { usePermissions } from '@/hooks/usePermissions'
import { useToast } from '@/hooks/useToast'
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
  const { error: showError } = useToast()
  const { canCreate, canDelete } = usePermissions('documents')
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
    const result = await deleteDocument(id)
    if (result?.error) { showError(result.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input ref={inputRef} type="file" onChange={handleUpload} className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg" />
        {canCreate.allowed ? (
          <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Upload document'}
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" disabled className="opacity-50 cursor-not-allowed">
            <Lock size={14} />
            Upload document
          </Button>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-300">{error}</p>}
      </div>

      {extracting && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gold-50 dark:bg-gold-900/20 rounded-lg ring-1 ring-gold-200 dark:ring-gold-700/40 text-xs text-primary-700 dark:text-primary-300">
          <Loader2 size={13} className="animate-spin flex-shrink-0" />
          <span>Analyzing document with AI — this may take up to 30 seconds…</span>
        </div>
      )}

      {extractError && (
        <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 ring-1 ring-red-200 dark:ring-red-900/40">{extractError}</p>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No documents yet.</p>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              {/* Document row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-900 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/60 transition-colors">
                <span className="text-lg flex-shrink-0">{fileIcon(doc.file_name)}</span>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-100 hover:text-primary-500 truncate transition-colors">
                  {doc.file_name}
                </a>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* AI extract button */}
                  <button
                    onClick={() => doc.extracted_data ? setExpanded(expanded === doc.id ? null : doc.id) : handleExtract(doc)}
                    disabled={extracting === doc.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      doc.extracted_data
                        ? 'text-primary-500 bg-gold-50 dark:bg-gold-900/20 hover:bg-gold-100 dark:hover:bg-gold-900/30'
                        : 'text-neutral-600 dark:text-neutral-300 hover:text-primary-500 hover:bg-gold-50 dark:hover:bg-gold-900/20'
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
                  {canDelete.allowed && (
                    <button onClick={() => handleDelete(doc.id, doc.file_url)}
                      className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Extracted data panel */}
              {doc.extracted_data && expanded === doc.id && (
                <div className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/60 px-4 py-4 space-y-4">
                  {doc.extracted_data.summary && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Summary</p>
                      <p className="text-sm text-neutral-800 dark:text-neutral-100 leading-relaxed">{doc.extracted_data.summary}</p>
                    </div>
                  )}

                  {doc.extracted_data.metrics && Object.keys(doc.extracted_data.metrics).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Extracted Metrics</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(doc.extracted_data.metrics).map(([k, v]) => (
                          <div key={k} className="bg-white dark:bg-neutral-900 rounded-lg px-3 py-2 ring-1 ring-slate-200 dark:ring-neutral-700">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">{k}</p>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {doc.extracted_data.key_points && doc.extracted_data.key_points.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Key Points</p>
                      <ul className="space-y-1.5">
                        {doc.extracted_data.key_points.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-neutral-800 dark:text-neutral-100">
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
                    className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-primary-500 transition-colors"
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
