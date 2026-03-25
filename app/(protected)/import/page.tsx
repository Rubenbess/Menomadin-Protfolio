'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'

type Status = 'idle' | 'uploading' | 'success' | 'error'

interface ImportResults {
  companies:   { created: number; updated: number }
  rounds:      { created: number }
  investments: { created: number }
  capTable:    { created: number }
  errors:      string[]
}

export default function ImportPage() {
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
    <div className="max-w-2xl animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Import Data</h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload your Investment Dashboard Excel file to sync all portfolio data.
          </p>
        </div>
      </div>

      {/* Upload area */}
      {status === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
            ${dragOver
              ? 'border-violet-400 bg-violet-50'
              : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
              dragOver ? 'bg-violet-100' : 'bg-slate-100'
            }`}>
              <FileSpreadsheet size={26} className={dragOver ? 'text-violet-600' : 'text-slate-500'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Drop your Excel file here, or{' '}
                <span className="text-violet-600">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports .xlsx and .xls</p>
            </div>
          </div>
        </div>
      )}

      {/* Uploading */}
      {status === 'uploading' && (
        <div className="border-2 border-dashed border-violet-300 bg-violet-50/60 rounded-2xl p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
              <Upload size={26} className="text-violet-600 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Importing {fileName}…</p>
              <p className="text-xs text-slate-400 mt-1">Parsing data and syncing to database</p>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'success' && results && (
        <div className="space-y-4">
          <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0" />
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
            <Button onClick={() => router.push('/dashboard')}>
              View Dashboard <ArrowRight size={14} />
            </Button>
            <Button variant="secondary" onClick={reset}>
              <RefreshCw size={14} /> Import another file
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 ring-1 ring-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <AlertCircle size={22} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Import failed</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={reset}>
            <RefreshCw size={14} /> Try again
          </Button>
        </div>
      )}

      {/* How it works */}
      {status === 'idle' && (
        <div className="mt-6 bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">How it works</h3>
          <ol className="space-y-3">
            {[
              'Upload your Investment Dashboard Excel file (.xlsx)',
              'The app reads the "Data_Raw" sheet and syncs all companies, rounds, investments and cap table entries',
              'Existing records are updated — duplicates are automatically handled',
              'All KPIs (MOIC, TVPI, NAV, ownership %) recalculate instantly from the new data',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                <span className="flex-shrink-0 w-5 h-5 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">Expected format:</span> Your Excel must have a sheet named{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded-lg text-xs">Data_Raw</code> with columns: Investment Name,
              Entity, Sector, Geography, Stage, Type, Invested Amount, Pre-money Valuation, Post Money Valuation,
              Current Valuation, Ownership Percentage.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
