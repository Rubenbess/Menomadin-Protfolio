'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, Trash2, Search, X, FolderOpen, FileText, ExternalLink,
  Filter, Calendar, Building2, ChevronDown,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/EmptyState'
import { createClient } from '@/lib/supabase'
import { createGlobalDocument, deleteGlobalDocument } from '@/actions/global-documents'
import type { GlobalDocument, DocumentCategory, Company } from '@/lib/types'

const CATEGORIES: DocumentCategory[] = [
  'Term Sheet', 'SHA', 'Investment Agreement', 'Board Minutes',
  'Financials', 'Pitch Deck', 'Legal', 'Other',
]

const CAT_COLORS: Record<DocumentCategory, string> = {
  'Term Sheet':           'bg-brand-100 text-brand-600',
  'SHA':                  'bg-blue-100 text-blue-700',
  'Investment Agreement': 'bg-emerald-100 text-emerald-700',
  'Board Minutes':        'bg-amber-100 text-amber-700',
  'Financials':           'bg-teal-100 text-teal-700',
  'Pitch Deck':           'bg-rose-100 text-rose-700',
  'Legal':                'bg-orange-100 text-orange-700',
  'Other':                'bg-slate-100 text-slate-600',
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf')            return '📄'
  if (['ppt','pptx'].includes(ext ?? '')) return '📑'
  if (['xls','xlsx','csv'].includes(ext ?? '')) return '📊'
  if (['doc','docx'].includes(ext ?? '')) return '📝'
  if (['png','jpg','jpeg','gif','webp'].includes(ext ?? '')) return '🖼️'
  return '📎'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const inp = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all'
const lbl = 'block text-sm font-medium text-slate-700 mb-1.5'

// ── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({
  companies,
  onClose,
}: {
  companies: Pick<Company, 'id' | 'name'>[]
  onClose: () => void
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile]         = useState<File | null>(null)
  const [category, setCategory] = useState<DocumentCategory>('Other')
  const [companyId, setCompanyId] = useState('')
  const [docDate, setDocDate]   = useState('')
  const [notes, setNotes]       = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select a file'); return }
    setUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const path = `global/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      await createGlobalDocument({
        file_url:   urlData.publicUrl,
        file_name:  file.name,
        category,
        company_id: companyId || null,
        doc_date:   docDate || null,
        notes:      notes || null,
      })
      router.refresh()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* File picker */}
      <div>
        <label className={lbl}>File *</label>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-50 border border-violet-200 rounded-xl">
            <span>{fileIcon(file.name)}</span>
            <span className="text-sm text-brand-600 flex-1 truncate">{file.name}</span>
            <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-200 hover:text-brand-500 transition-colors"
          >
            <Upload size={18} /> Click to select file
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as DocumentCategory)} className={inp}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Company (optional)</label>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inp}>
            <option value="">— None —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Document Date</label>
        <input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} className={inp} />
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Brief description…" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-200">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={uploading} className="flex-1">
          <Upload size={14} /> Upload document
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

// ── PDF Preview Modal ────────────────────────────────────────────────────────

function PdfPreview({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span>{fileIcon(name)}</span>
            <span className="text-sm font-semibold text-slate-800 truncate max-w-xs">{name}</span>
          </div>
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium">
              Open <ExternalLink size={12} />
            </a>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <iframe src={url} className="flex-1 w-full" title={name} />
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  documents: GlobalDocument[]
  companies: Pick<Company, 'id' | 'name'>[]
}

export default function DocumentsVaultClient({ documents, companies }: Props) {
  const router = useRouter()
  const [showUpload, setShowUpload]     = useState(false)
  const [search, setSearch]             = useState('')
  const [catFilter, setCatFilter]       = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [previewDoc, setPreviewDoc]     = useState<GlobalDocument | null>(null)

  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c.name])), [companies])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return documents.filter(d => {
      const matchSearch = !q ||
        d.file_name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        (d.notes?.toLowerCase().includes(q) ?? false) ||
        (d.company_id && companyMap[d.company_id]?.toLowerCase().includes(q))
      const matchCat = !catFilter || d.category === catFilter
      const matchCo  = !companyFilter || d.company_id === companyFilter
      return matchSearch && matchCat && matchCo
    })
  }, [documents, search, catFilter, companyFilter, companyMap])

  const hasFilters = !!(search || catFilter || companyFilter)

  async function handleDelete(doc: GlobalDocument) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return
    const supabase = createClient()
    const url = new URL(doc.file_url)
    const path = url.pathname.split('/documents/')[1]
    if (path) await supabase.storage.from('documents').remove([path])
    await deleteGlobalDocument(doc.id)
    router.refresh()
  }

  const uniqueCompanies = companies.filter(c => documents.some(d => d.company_id === c.id))

  // Category summary
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of documents) counts[d.category] = (counts[d.category] ?? 0) + 1
    return counts
  }, [documents])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Vault</h1>
          <p className="text-sm text-slate-400 mt-0.5">{documents.length} documents</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload size={15} /> Upload Document
        </Button>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setCatFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            !catFilter ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          All ({documents.length})
        </button>
        {CATEGORIES.filter(c => catCounts[c]).map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat === catFilter ? '' : cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              catFilter === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {cat} ({catCounts[cat]})
          </button>
        ))}
      </div>

      {/* Search + filter row */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        {uniqueCompanies.length > 0 && (
          <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="py-1.5 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer">
            <option value="">All companies</option>
            {uniqueCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setCatFilter(''); setCompanyFilter('') }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <X size={12} /> Clear
          </button>
        )}

        <span className="text-xs text-slate-400 ml-auto">{filtered.length} results</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.05]">
          <EmptyState
            type="documents"
            title={hasFilters ? 'No documents found' : 'No documents yet'}
            description={hasFilters ? 'Try adjusting your filters.' : 'Start organizing your portfolio documents by uploading your first file.'}
            action={
              !hasFilters && (
                <Button onClick={() => setShowUpload(true)}>
                  <Upload size={14} /> Upload your first document
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Notes</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.id} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => doc.file_name.toLowerCase().endsWith('.pdf') ? setPreviewDoc(doc) : window.open(doc.file_url, '_blank')}
                      className="flex items-center gap-2.5 text-left group"
                    >
                      <span className="text-lg flex-shrink-0">{fileIcon(doc.file_name)}</span>
                      <span className="font-medium text-slate-800 group-hover:text-brand-500 transition-colors truncate max-w-[200px]">{doc.file_name}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[doc.category]}`}>
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    {doc.company_id && companyMap[doc.company_id] ? (
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        <Building2 size={12} className="text-slate-300" />
                        {companyMap[doc.company_id]}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    {doc.doc_date ? (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={11} className="text-slate-300" />
                        {fmtDate(doc.doc_date)}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 hidden xl:table-cell">
                    {doc.notes ? (
                      <span className="text-xs text-slate-500 truncate max-w-[160px] block">{doc.notes}</span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Open"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Document">
        <UploadModal companies={companies} onClose={() => setShowUpload(false)} />
      </Modal>

      {/* PDF preview */}
      {previewDoc && (
        <PdfPreview url={previewDoc.file_url} name={previewDoc.file_name} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  )
}
