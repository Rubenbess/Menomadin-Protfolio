'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '@/components/ui/Button'
import { importParsedCapTable } from '@/actions/cap-table'
import type { CapTableParseResult } from '@/lib/types'

interface Props {
  importId: string
  parseResult: CapTableParseResult
  onImportComplete: () => void
  onBack: () => void
}

export default function CapTableReviewScreen({
  importId,
  parseResult,
  onImportComplete,
  onBack,
}: Props) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const rowsWithErrors = parseResult.parsedRows.filter(r => r.validation_errors.length > 0)
  const rowsWithWarnings = parseResult.parsedRows.filter(
    r => r.validation_warnings.length > 0 && r.validation_errors.length === 0
  )
  const validRows = parseResult.parsedRows.filter(
    r => r.validation_errors.length === 0 && r.validation_warnings.length === 0
  )

  // Toggle row selection
  function toggleRow(rowIndex: number) {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex)
    } else {
      newSelected.add(rowIndex)
    }
    setSelectedRows(newSelected)
  }

  // Select all valid rows
  function selectAllValid() {
    const indices = new Set<number>()
    parseResult.parsedRows
      .filter(r => r.validation_errors.length === 0)
      .forEach(r => indices.add(r.row_index))
    setSelectedRows(indices)
  }

  // Handle import
  async function handleImport() {
    if (selectedRows.size === 0) {
      setImportError('Please select at least one row to import')
      return
    }

    setImportLoading(true)
    setImportError('')

    try {
      const result = await importParsedCapTable(importId, Array.from(selectedRows))

      if (result.error) {
        setImportError(result.error)
        return
      }

      onImportComplete()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
          Review & Import
        </h3>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/50">
            <p className="text-xs text-blue-600 dark:text-blue-400">Total Rows</p>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-300">
              {parseResult.totalRows}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Valid</p>
            <p className="text-lg font-bold text-emerald-900 dark:text-emerald-300">
              {validRows.length}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-900/50">
            <p className="text-xs text-amber-600 dark:text-amber-400">Warnings</p>
            <p className="text-lg font-bold text-amber-900 dark:text-amber-300">
              {rowsWithWarnings.length}
            </p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
            <p className="text-xs text-red-600 dark:text-red-400">Errors</p>
            <p className="text-lg font-bold text-red-900 dark:text-red-300">
              {rowsWithErrors.length}
            </p>
          </div>
        </div>

        {/* Global warnings */}
        {parseResult.warnings.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-400 mb-2">
              ⚠️ Warnings
            </p>
            <ul className="space-y-1">
              {parseResult.warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-800 dark:text-amber-300">
                  • {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Global errors */}
        {parseResult.errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg">
            <p className="text-xs font-semibold text-red-900 dark:text-red-400 mb-2">
              ❌ Errors
            </p>
            <ul className="space-y-1">
              {parseResult.errors.map((e, i) => (
                <li key={i} className="text-xs text-red-800 dark:text-red-300">
                  • {e}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Row selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-neutral-900 dark:text-white">
            Select Rows to Import
          </h4>
          <button
            onClick={selectAllValid}
            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            Select All Valid ({validRows.length})
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {/* Valid rows */}
          {validRows.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                ✓ Valid Rows ({validRows.length})
              </p>
              {validRows.map(row => (
                <RowItem
                  key={row.row_index}
                  row={row}
                  isSelected={selectedRows.has(row.row_index)}
                  onToggle={() => toggleRow(row.row_index)}
                  isExpanded={expandedRow === row.row_index}
                  onToggleExpand={() =>
                    setExpandedRow(expandedRow === row.row_index ? null : row.row_index)
                  }
                />
              ))}
            </div>
          )}

          {/* Rows with warnings */}
          {rowsWithWarnings.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">
                ⚠️ Warnings ({rowsWithWarnings.length})
              </p>
              {rowsWithWarnings.map(row => (
                <RowItem
                  key={row.row_index}
                  row={row}
                  isSelected={selectedRows.has(row.row_index)}
                  onToggle={() => toggleRow(row.row_index)}
                  isExpanded={expandedRow === row.row_index}
                  onToggleExpand={() =>
                    setExpandedRow(expandedRow === row.row_index ? null : row.row_index)
                  }
                  status="warning"
                />
              ))}
            </div>
          )}

          {/* Rows with errors */}
          {rowsWithErrors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
                ❌ Errors ({rowsWithErrors.length})
              </p>
              {rowsWithErrors.map(row => (
                <RowItem
                  key={row.row_index}
                  row={row}
                  isSelected={false}
                  onToggle={() => {}}
                  isExpanded={expandedRow === row.row_index}
                  onToggleExpand={() =>
                    setExpandedRow(expandedRow === row.row_index ? null : row.row_index)
                  }
                  status="error"
                  disabled
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {importError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-700 dark:text-red-400">
          {importError}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 justify-end">
        <Button onClick={onBack} variant="secondary" disabled={importLoading}>
          Back
        </Button>
        <Button
          onClick={handleImport}
          disabled={selectedRows.size === 0 || importLoading}
          loading={importLoading}
        >
          {importLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Importing...
            </>
          ) : (
            `Import ${selectedRows.size} Row${selectedRows.size !== 1 ? 's' : ''}`
          )}
        </Button>
      </div>
    </div>
  )
}

function RowItem({
  row,
  isSelected,
  onToggle,
  isExpanded,
  onToggleExpand,
  status = 'valid',
  disabled = false,
}: {
  row: any
  isSelected: boolean
  onToggle: () => void
  isExpanded: boolean
  onToggleExpand: () => void
  status?: 'valid' | 'warning' | 'error'
  disabled?: boolean
}) {
  const bgColor =
    status === 'error'
      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50'
      : status === 'warning'
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50'
        : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-900/30'

  const shareholder = row.normalized_data?.shareholder_name || '(empty)'
  const ownership = row.normalized_data?.ownership_percentage

  return (
    <div className={`border rounded-lg transition-colors ${bgColor} ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 p-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          disabled={disabled || status === 'error'}
          className="rounded cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
            {shareholder}
          </p>
          {ownership && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {ownership}% ownership
            </p>
          )}
        </div>

        {status === 'error' && <AlertCircle size={16} className="text-red-600 flex-shrink-0" />}
        {status === 'warning' && <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />}
        {status === 'valid' && <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />}

        <button
          onClick={onToggleExpand}
          className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-inherit px-3 py-3 bg-black/5 dark:bg-white/5 space-y-2">
          {row.validation_errors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                Errors:
              </p>
              <ul className="space-y-0.5">
                {row.validation_errors.map((e: string, i: number) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400">
                    • {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {row.validation_warnings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                Warnings:
              </p>
              <ul className="space-y-0.5">
                {row.validation_warnings.map((w: string, i: number) => (
                  <li key={i} className="text-xs text-amber-600 dark:text-amber-400">
                    • {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Object.entries(row.normalized_data).map(([key, value]) => (
            <div key={key}>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 capitalize">
                {key.replace(/_/g, ' ')}:
              </p>
              <p className="text-xs font-medium text-neutral-900 dark:text-white">
                {value ? String(value) : '(empty)'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
