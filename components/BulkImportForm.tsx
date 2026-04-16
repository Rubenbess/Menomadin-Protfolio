'use client'

import { useState, useRef } from 'react'
import { Upload, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { ImportResult } from '@/lib/bulk-import-utils'

interface BulkImportFormProps {
  onImport: (formData: FormData) => Promise<ImportResult>
  importType: 'companies' | 'contacts'
  templateHeaders: string[]
}

export function BulkImportForm({
  onImport,
  importType,
  templateHeaders,
}: BulkImportFormProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      await handleFile(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls']
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)')
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const importResult = await onImport(formData)
      setResult(importResult)

      if (importResult.success && importResult.imported > 0) {
        toast.success(
          `Successfully imported ${importResult.imported} ${importType}`
        )
      } else if (importResult.imported > 0) {
        toast.info(
          `Imported ${importResult.imported}/${importResult.total} ${importType}`
        )
      } else {
        toast.error('No items were imported')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Import failed'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const downloadTemplate = () => {
    const csv = templateHeaders.join(',')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${importType}-template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 transition-colors ${
          isDragging
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
            : 'border-neutral-300 dark:border-neutral-600 hover:border-amber-400'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <Upload
            size={32}
            className={isDragging ? 'text-amber-600' : 'text-neutral-500'}
          />
          <div className="text-center">
            <p className="font-medium text-neutral-900 dark:text-white">
              Drag and drop your CSV or Excel file
            </p>
            <p className="text-sm text-neutral-700 dark:text-neutral-500 mt-1">
              .csv, .xlsx, .xls — or click to browse
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            disabled={isLoading}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="mt-4 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {isLoading ? 'Importing...' : 'Select File'}
          </button>
        </div>
      </div>

      {/* Template Download */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Need help formatting your CSV?
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Download our template to see the expected format. Required fields:
              name. Optional fields: {templateHeaders.slice(1).join(', ')}
            </p>
            <button
              onClick={downloadTemplate}
              className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Download Template →
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
              <p className="text-sm text-neutral-700 dark:text-neutral-500">
                Total Rows
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                {result.total}
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 p-4">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Imported
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {result.imported}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {result.failed}
              </p>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <h4 className="font-medium text-red-900 dark:text-red-100">
                    Errors ({result.errors.length})
                  </h4>
                  <div className="mt-2 space-y-1">
                    {result.errors.slice(0, 10).map((error, idx) => (
                      <p
                        key={idx}
                        className="text-sm text-red-700 dark:text-red-300"
                      >
                        Row {error.row}, {error.field}: {error.message}
                      </p>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                        +{result.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-900 dark:text-amber-100">
                    Warnings ({result.warnings.length})
                  </h4>
                  <div className="mt-2 space-y-1">
                    {result.warnings.slice(0, 5).map((warning, idx) => (
                      <p
                        key={idx}
                        className="text-sm text-amber-700 dark:text-amber-300"
                      >
                        Row {warning.row}, {warning.field}: {warning.message}
                      </p>
                    ))}
                    {result.warnings.length > 5 && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                        +{result.warnings.length - 5} more warnings
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {result.imported > 0 && result.errors.length === 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-medium text-emerald-900 dark:text-emerald-100">
                    Import Complete
                  </h4>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                    Successfully imported {result.imported} {importType}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
