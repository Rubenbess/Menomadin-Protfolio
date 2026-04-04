'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Loader2, FileText } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { uploadAndParseCapTableFile } from '@/actions/cap-table'
import type { CapTableParseResult, ParsedCapTableRow } from '@/lib/types'
import CapTableColumnMapper from './CapTableColumnMapper'
import CapTableReviewScreen from './CapTableReviewScreen'

interface Props {
  companyId: string
  isOpen: boolean
  onClose: () => void
}

type Step = 'upload' | 'map' | 'review'

export default function CapTableUploadModal({ companyId, isOpen, onClose }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [parseResult, setParseResult] = useState<CapTableParseResult | null>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type by extension
    const fileName = file.name.toLowerCase()
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    const isCSV = fileName.endsWith('.csv')

    if (!isExcel && !isCSV) {
      setError('File must be Excel (.xlsx, .xls) or CSV (.csv)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const buffer = await file.arrayBuffer()
      const result = await uploadAndParseCapTableFile(
        companyId,
        Buffer.from(buffer),
        file.name,
        file.type
      )

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.result) {
        setParseResult(result.result)
        setStep('map')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep('upload')
    setError('')
    setParseResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  function handleImportComplete() {
    handleClose()
    router.refresh()
  }

  return (
    <Modal open={isOpen} onClose={handleClose} title="Import Cap Table">
      <div className="flex items-center justify-between mb-6"></div>

      {/* Progress indicator */}
      <div className="flex gap-2 mb-8">
        <div
          className={`flex-1 h-1 rounded-full transition-colors ${
            step === 'upload' || step === 'map' || step === 'review'
              ? 'bg-primary-500'
              : 'bg-neutral-200 dark:bg-neutral-700'
          }`}
        />
        <div
          className={`flex-1 h-1 rounded-full transition-colors ${
            step === 'map' || step === 'review'
              ? 'bg-primary-500'
              : 'bg-neutral-200 dark:bg-neutral-700'
          }`}
        />
        <div
          className={`flex-1 h-1 rounded-full transition-colors ${
            step === 'review' ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'
          }`}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-8 text-center">
            <Upload size={40} className="mx-auto mb-3 text-neutral-400 dark:text-neutral-600" />
            <p className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
              Upload Excel or CSV file
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Supports .xlsx, .xls, and .csv formats
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={loading}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              variant="secondary"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Choose File
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-3 justify-end">
            <Button onClick={handleClose} variant="secondary">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === 'map' && parseResult && (
        <CapTableColumnMapper
          parseResult={parseResult}
          onNext={(result) => {
            setParseResult(result)
            setStep('review')
          }}
          onBack={() => setStep('upload')}
        />
      )}

      {/* Step 3: Review & Import */}
      {step === 'review' && parseResult && (
        <CapTableReviewScreen
          importId={parseResult.importId}
          parseResult={parseResult}
          onImportComplete={handleImportComplete}
          onBack={() => setStep('map')}
        />
      )}
    </Modal>
  )
}
