'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, FileText, Users, Building2 } from 'lucide-react'
import Button from '@/components/ui/Button'

type Status = 'idle' | 'uploading' | 'success' | 'error'

interface ImportResults {
  companies:   { created: number; updated: number }
  rounds:      { created: number }
  investments: { created: number }
  capTable:    { created: number }
  errors:      string[]
}

interface TrelloResults {
  stagesCreated: number
  cardsCreated:  number
  errors:        string[]
}

// ── Excel Import ─────────────────────────────────────────────────────────────

function ExcelImport() {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [status,   setStatus]   = useState<Status>('idle')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [results,  setResults]  = useState<ImportResults | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function processFile(file: File) {
    const validExt = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    if (!validExt) {
      setErrorMsg('Please upload an Excel file (.xlsx or .xls)')
      setStatus('error')
      return
    }
    setFileName(file.name)
    setStatus('uploading')
    setResults(null)
    setErrorMsg('')

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res  = await fetch('/api/import', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) {
        setErrorMsg(json.error || 'Import failed')
        setStatus('error')
        return
      }
      setResults(json.results)
      setStatus('success')
      router.refresh()
    } catch {
      setErrorMsg('Network error — please try again')
      setStatus('error')
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function reset() {
    setStatus('idle')
    setFileName('')
    setResults(null)
    setErrorMsg('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
          <FileSpreadsheet size={16} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Excel — Portfolio Data</h2>
          <p className="text-xs text-slate-400">Syncs companies, rounds, investments &amp; cap table</p>
        </div>
      </div>

      {status === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
            ${dragOver
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}
          `}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <FileSpreadsheet size={22} className={dragOver ? 'text-emerald-600' : 'text-slate-500'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Drop your Excel file here, or <span className="text-emerald-600">browse</span></p>
              <p className="text-xs text-slate-400 mt-1">Supports .xlsx and .xls</p>
            </div>
          </div>
        </div>
      )}

      {status === 'uploading' && (
        <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/60 rounded-2xl p-10 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Upload size={22} className="text-emerald-600 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Importing {fileName}…</p>
              <p className="text-xs text-slate-400 mt-1">Parsing data and syncing to database</p>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && results && (
        <div className="space-y-4">
          <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Import successful</p>
                <p className="text-xs text-emerald-600 mt-0.5">{fileName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Companies',   value: `${results.companies.created} created, ${results.companies.updated} updated` },
                { label: 'Rounds',      value: `${results.rounds.created} synced` },
                { label: 'Investments', value: `${results.investments.created} synced` },
                { label: 'Cap Table',   value: `${results.capTable.created} entries` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl p-3 ring-1 ring-emerald-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            {results.errors.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-xs font-semibold text-amber-700">Warnings:</p>
                {results.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-600">{e}</p>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/dashboard')}>View Dashboard <ArrowRight size={14} /></Button>
            <Button variant="secondary" onClick={reset}><RefreshCw size={14} /> Import another</Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 ring-1 ring-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Import failed</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={reset}><RefreshCw size={14} /> Try again</Button>
        </div>
      )}
    </div>
  )
}

// ── Trello Import ─────────────────────────────────────────────────────────────

function TrelloImport() {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [status,   setStatus]   = useState<Status>('idle')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [results,  setResults]  = useState<TrelloResults | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function processFile(file: File) {
    if (!file.name.endsWith('.json')) {
      setErrorMsg('Please upload a Trello JSON export file (.json)')
      setStatus('error')
      return
    }
    setFileName(file.name)
    setStatus('uploading')
    setResults(null)
    setErrorMsg('')

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res  = await fetch('/api/import/trello', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) {
        setErrorMsg(json.error || 'Import failed')
        setStatus('error')
        return
      }
      setResults(json.results)
      setStatus('success')
      router.refresh()
    } catch {
      setErrorMsg('Network error — please try again')
      setStatus('error')
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function reset() {
    setStatus('idle')
    setFileName('')
    setResults(null)
    setErrorMsg('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gold-100 rounded-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gold-500">
            <rect x="2" y="2" width="9" height="14" rx="2" fill="currentColor" opacity="0.8"/>
            <rect x="13" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.5"/>
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Trello — Deal Pipeline</h2>
          <p className="text-xs text-slate-400">Imports lists as stages and cards as pipeline deals</p>
        </div>
      </div>

      {status === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
            ${dragOver
              ? 'border-gold-300 bg-gold-50'
              : 'border-slate-200 hover:border-gold-200 hover:bg-slate-50'}
          `}
        >
          <input ref={inputRef} type="file" accept=".json" onChange={handleFileInput} className="hidden" />
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? 'bg-gold-100' : 'bg-slate-100'}`}>
              <Upload size={22} className={dragOver ? 'text-gold-500' : 'text-slate-500'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Drop your Trello JSON here, or <span className="text-gold-500">browse</span></p>
              <p className="text-xs text-slate-400 mt-1">Export from Trello: Board → Share → Export as JSON</p>
            </div>
          </div>
        </div>
      )}

      {status === 'uploading' && (
        <div className="border-2 border-dashed border-gold-200 bg-gold-50/60 rounded-2xl p-10 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-gold-100 rounded-2xl flex items-center justify-center">
              <Upload size={22} className="text-gold-500 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Importing {fileName}…</p>
              <p className="text-xs text-slate-400 mt-1">Creating stages and deals in your pipeline</p>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && results && (
        <div className="space-y-4">
          <div className="bg-gold-50 ring-1 ring-violet-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 size={20} className="text-gold-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-violet-800">Trello import successful</p>
                <p className="text-xs text-gold-500 mt-0.5">{fileName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 ring-1 ring-gold-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stages</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{results.stagesCreated} created</p>
              </div>
              <div className="bg-white rounded-xl p-3 ring-1 ring-gold-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deals</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{results.cardsCreated} imported</p>
              </div>
            </div>
            {results.errors.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-xs font-semibold text-amber-700">Warnings:</p>
                {results.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-600">{e}</p>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/pipeline')}>View Pipeline <ArrowRight size={14} /></Button>
            <Button variant="secondary" onClick={reset}><RefreshCw size={14} /> Import another</Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 ring-1 ring-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Import failed</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={reset}><RefreshCw size={14} /> Try again</Button>
        </div>
      )}
    </div>
  )
}

// ── CSV Import ────────────────────────────────────────────────────────────────

function CsvImport({ type, label, icon: Icon, color, hint }: {
  type: 'contacts' | 'companies'
  label: string
  icon: React.ElementType
  color: string
  hint: string
}) {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [status,   setStatus]  = useState<Status>('idle')
  const [fileName, setFileName] = useState('')
  const [created,  setCreated] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  async function processFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Please upload a CSV file (.csv)')
      setStatus('error')
      return
    }
    setFileName(file.name)
    setStatus('uploading')

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res  = await fetch(`/api/import/csv?type=${type}`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) {
        setErrorMsg(json.error || 'Import failed')
        setStatus('error')
        return
      }
      setCreated(json.created)
      setStatus('success')
      router.refresh()
    } catch {
      setErrorMsg('Network error — please try again')
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle'); setFileName(''); setCreated(0); setErrorMsg('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const bgColor = color === 'blue'
    ? { idle: 'hover:border-blue-300', drag: 'border-blue-400 bg-blue-50', icon: 'bg-blue-100', iconText: 'text-blue-600', success: 'bg-blue-50 ring-blue-200', successText: 'text-blue-800', badge: 'bg-blue-100' }
    : { idle: 'hover:border-rose-300', drag: 'border-rose-400 bg-rose-50', icon: 'bg-rose-100', iconText: 'text-rose-600', success: 'bg-rose-50 ring-rose-200', successText: 'text-rose-800', badge: 'bg-rose-100' }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 ${bgColor.badge} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className={bgColor.iconText} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">CSV — {label}</h2>
          <p className="text-xs text-slate-400">{hint}</p>
        </div>
      </div>

      {status === 'idle' && (
        <div
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all border-slate-200 ${bgColor.idle} hover:bg-slate-50`}
        >
          <input ref={inputRef} type="file" accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} className="hidden" />
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bgColor.icon}`}>
              <Upload size={18} className={bgColor.iconText} />
            </div>
            <p className="text-sm font-semibold text-slate-900">Drop CSV here or <span className={bgColor.iconText}>browse</span></p>
            <p className="text-xs text-slate-400">First row must be column headers</p>
          </div>
        </div>
      )}

      {status === 'uploading' && (
        <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-slate-600">Importing {fileName}…</p>
        </div>
      )}

      {status === 'success' && (
        <div className={`ring-1 rounded-2xl p-5 ${bgColor.success}`}>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 size={18} className={bgColor.iconText} />
            <p className={`text-sm font-semibold ${bgColor.successText}`}>{created} {label.toLowerCase()} imported</p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={reset}><RefreshCw size={13} /> Import more</Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <div className="bg-red-50 ring-1 ring-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
          <Button variant="secondary" onClick={reset}><RefreshCw size={13} /> Try again</Button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Import Data</h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload files to sync portfolio data or import your deal pipeline.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Excel import */}
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-6">
          <ExcelImport />
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">Expected format:</span> Excel must have a sheet named{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">Data_Raw</code> with columns:
              Investment Name, Entity, Sector, Geography, Stage, Type, Invested Amount, Pre-money Valuation,
              Post Money Valuation, Current Valuation, Ownership Percentage.
            </p>
          </div>
        </div>

        {/* CSV — Contacts */}
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-6">
          <CsvImport
            type="contacts"
            label="Contacts"
            icon={Users}
            color="blue"
            hint="Import contacts with email, phone, address"
          />
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">Expected columns (any order):</span>{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">name</code>,{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">email</code>,{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">phone</code>,{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">position</code>,{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">address</code>,{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">linkedin</code>,{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">notes</code>
            </p>
          </div>
        </div>

        {/* CSV — Companies */}
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-6">
          <CsvImport
            type="companies"
            label="Companies"
            icon={Building2}
            color="rose"
            hint="Bulk import portfolio companies"
          />
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">Expected columns:</span>{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">name</code>,{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">sector</code>,{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">hq</code>,{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">strategy</code> (impact/venture),{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">status</code> (active/exited…),{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">description</code>
            </p>
          </div>
        </div>

        {/* Trello import */}
        <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-6">
          <TrelloImport />
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">How to export from Trello:</span> Open your board →
              click <span className="font-medium text-slate-500">Share</span> (top right) →{' '}
              <span className="font-medium text-slate-500">Export as JSON</span>. Each list becomes a pipeline
              stage and each card becomes a deal. Card labels are used as the sector.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
