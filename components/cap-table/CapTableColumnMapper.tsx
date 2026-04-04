'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { CapTableParseResult, ColumnType } from '@/lib/types'

interface Props {
  parseResult: CapTableParseResult
  onNext: (result: CapTableParseResult) => void
  onBack: () => void
}

const COLUMN_LABELS: Record<ColumnType, string> = {
  shareholder_name: 'Shareholder Name',
  ownership_percentage: 'Ownership %',
  share_count: 'Share Count',
  investment_amount: 'Investment Amount',
  holder_type: 'Holder Type',
  security_type: 'Security Type',
  issue_date: 'Issue Date',
  conversion_ratio: 'Conversion Ratio',
  liquidation_preference: 'Liquidation Pref',
  notes: 'Notes',
  ignore: 'Ignore',
}

const COLUMN_TYPES: ColumnType[] = [
  'shareholder_name',
  'ownership_percentage',
  'share_count',
  'investment_amount',
  'holder_type',
  'security_type',
  'issue_date',
  'conversion_ratio',
  'liquidation_preference',
  'notes',
  'ignore',
]

export default function CapTableColumnMapper({ parseResult, onNext, onBack }: Props) {
  const [mappings, setMappings] = useState(parseResult.columnMappings)

  function handleMappingChange(header: string, columnType: ColumnType) {
    setMappings(prev => ({
      ...prev,
      [header]: columnType,
    }))
  }

  function handleNext() {
    // Update parse result with new mappings and re-normalize rows
    const updatedResult: CapTableParseResult = {
      ...parseResult,
      columnMappings: mappings,
    }
    onNext(updatedResult)
  }

  // Identify unmapped or critical missing columns
  const mappedTypes = Object.values(mappings).filter(t => t !== 'ignore')
  const hasName = mappedTypes.includes('shareholder_name')
  const hasOwnership = mappedTypes.includes('ownership_percentage')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
          Column Mappings
        </h3>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
          Assign each column to the corresponding field. Fields marked with * are recommended.
        </p>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {Object.entries(mappings).map(([header, currentType]) => (
            <div
              key={header}
              className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {header}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {parseResult.parsedRows[0]?.raw_data[header] ? String(parseResult.parsedRows[0].raw_data[header]).substring(0, 40) : '(empty)'}
                </p>
              </div>

              <select
                value={currentType}
                onChange={e => handleMappingChange(header, e.target.value as ColumnType)}
                className="px-2 py-1.5 text-sm bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {COLUMN_TYPES.map(type => (
                  <option key={type} value={type}>
                    {COLUMN_LABELS[type]}
                    {(type === 'shareholder_name' || type === 'ownership_percentage') ? ' *' : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {!hasName && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-400">
            ⚠️ Shareholder Name is required
          </p>
        </div>
      )}

      {!hasOwnership && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-400">
            ⚠️ Ownership % is highly recommended
          </p>
        </div>
      )}

      {/* Validation summary */}
      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Import Summary
        </p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-neutral-600 dark:text-neutral-400">Rows to Import</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">
              {parseResult.totalRows}
            </p>
          </div>
          {parseResult.errors.length > 0 && (
            <div>
              <p className="text-red-600 dark:text-red-400">Global Errors</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {parseResult.errors.length}
              </p>
            </div>
          )}
          {parseResult.warnings.length > 0 && (
            <div>
              <p className="text-amber-600 dark:text-amber-400">Warnings</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {parseResult.warnings.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end">
        <Button onClick={onBack} variant="secondary">
          Back
        </Button>
        <Button onClick={handleNext} disabled={!hasName}>
          Review Data
        </Button>
      </div>
    </div>
  )
}
