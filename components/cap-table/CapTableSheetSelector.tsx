'use client'

import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { WorkbookAnalysis } from '@/actions/cap-table-parser/workbook-inspector'

interface Props {
  analysis: WorkbookAnalysis
  onSelect: (sheetName: string) => void
  onBack: () => void
}

export default function CapTableSheetSelector({ analysis, onSelect, onBack }: Props) {
  if (analysis.sheets.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          No sheets found in workbook
        </div>
        <div className="flex gap-3 justify-end">
          <Button onClick={onBack} variant="secondary">
            Back
          </Button>
        </div>
      </div>
    )
  }

  // Group sheets by relevance score
  const capTableSheets = analysis.scoredSheets.filter(({ score }) => score > 30)
  const otherSheets = analysis.scoredSheets.filter(({ score }) => score <= 30)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-semibold text-neutral-900 dark:text-white">Select Sheet to Import</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {analysis.sheets.length > 1
            ? `Found ${analysis.sheets.length} sheets in workbook. Select which one contains the cap table.`
            : 'Only one sheet found in workbook.'}
        </p>
      </div>

      {capTableSheets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Likely Cap Table Sheets</h4>
          <div className="grid gap-2">
            {capTableSheets.map(({ sheet, score, matchedKeywords }) => (
              <SheetCard
                key={sheet.name}
                sheet={sheet}
                score={score}
                keywords={matchedKeywords}
                isLikelyCapTable={true}
                onSelect={() => onSelect(sheet.name)}
              />
            ))}
          </div>
        </div>
      )}

      {otherSheets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Other Sheets</h4>
          <div className="grid gap-2">
            {otherSheets.map(({ sheet, score, matchedKeywords }) => (
              <SheetCard
                key={sheet.name}
                sheet={sheet}
                score={score}
                keywords={matchedKeywords}
                isLikelyCapTable={false}
                onSelect={() => onSelect(sheet.name)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button onClick={onBack} variant="secondary">
          Back
        </Button>
      </div>
    </div>
  )
}

interface SheetCardProps {
  sheet: any
  score: number
  keywords: string[]
  isLikelyCapTable: boolean
  onSelect: () => void
}

function SheetCard({ sheet, score, keywords, isLikelyCapTable, onSelect }: SheetCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-3 rounded-lg border-2 transition-colors ${
        isLikelyCapTable
          ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30'
          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h5 className="font-medium text-neutral-900 dark:text-white">{sheet.name}</h5>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {sheet.rowCount} rows × {sheet.columnCount} columns
          </p>
        </div>
        {isLikelyCapTable && (
          <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-medium rounded">
            Likely Match
          </span>
        )}
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {keywords.slice(0, 3).map(keyword => (
            <span
              key={keyword}
              className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs rounded"
            >
              {keyword}
            </span>
          ))}
          {keywords.length > 3 && (
            <span className="px-2 py-1 text-neutral-600 dark:text-neutral-400 text-xs">
              +{keywords.length - 3} more
            </span>
          )}
        </div>
      )}

      {sheet.hasMergedCells && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">⚠️ Contains merged cells (may affect parsing)</p>
      )}
    </button>
  )
}
