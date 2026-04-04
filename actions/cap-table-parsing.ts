// Helper functions for cap table parsing
// Orchestrates modular parsing components

import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import type { ParsedCapTableRow, ColumnType } from '@/lib/types'
import { inspectWorkbook, type WorkbookAnalysis } from './cap-table-parser/workbook-inspector'
import { detectHeaderRow, type HeaderDetectionResult } from './cap-table-parser/header-detector'
import { extractTableData, type ExtractionResult } from './cap-table-parser/table-extractor'
import { inferColumnMappings, getColumnMappingDetails } from './cap-table-parser/column-normalizer'
import { validateRow, validateTable } from './cap-table-parser/validation-engine'

/**
 * Detect and analyze all sheets in workbook
 */
export function detectWorkbookSheets(workbook: XLSX.WorkBook): {
  sheets: Array<{ name: string; type: string; rowCount: number }>
  primaryCapTableSheet: string | null
  analysis: WorkbookAnalysis
} {
  const analysis = inspectWorkbook(workbook)

  const sheets = analysis.sheets.map(sheet => {
    // Determine type from scored results
    const scored = analysis.scoredSheets.find(s => s.sheet.name === sheet.name)
    const type = scored
      ? scored.matchedKeywords.length > 0
        ? scored.matchedKeywords[0]
        : 'other'
      : 'other'

    return {
      name: sheet.name,
      type,
      rowCount: sheet.rowCount,
    }
  })

  const primarySheet = analysis.primarySheetIndex !== null ? analysis.sheets[analysis.primarySheetIndex]?.name : null

  return {
    sheets,
    primaryCapTableSheet: primarySheet,
    analysis,
  }
}

/**
 * Parse Excel file with intelligent header detection and table extraction
 */
export function parseExcelFile(buffer: Buffer, sheetName?: string): {
  headers: string[]
  rows: Record<string, any>[]
  allSheets: string[]
  headerRowIndex: number
  headerDetectionResult: HeaderDetectionResult
  extractionResult: ExtractionResult
} {
  // Read workbook
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellFormula: false,
    cellStyles: false,
  })

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel file has no sheets')
  }

  // Select sheet
  const targetSheet = sheetName || workbook.SheetNames[0]
  const worksheet = workbook.Sheets[targetSheet]

  if (!worksheet) {
    throw new Error(`Sheet "${targetSheet}" not found in workbook`)
  }

  // Detect header row intelligently
  const headerDetection = detectHeaderRow(worksheet)

  if (headerDetection.headers.length === 0) {
    throw new Error('Could not detect any headers in sheet (all rows appear empty)')
  }

  // Allow detection even with low confidence - better to try than fail
  // Low confidence just means user may need to verify column mappings

  // Extract table data
  const extraction = extractTableData(worksheet, headerDetection.headers, headerDetection.headerRowIndex)

  if (extraction.data.length === 0) {
    // Detailed diagnostic information
    const scannedRows = Math.max(0, extraction.filteredRowCount)
    const totalRowsInSheet = Object.keys(worksheet)
      .filter(key => /^\d+$/.test(key.substring(1)) && key !== '!ref' && key !== '!merges')
      .length

    const message =
      scannedRows === 0 || extraction.filteredRowCount < 0
        ? `No data rows found. Headers detected at row ${headerDetection.headerRowIndex + 1}: [${headerDetection.headers.join(', ')}]. ` +
          `Header confidence: ${headerDetection.confidence}%. ` +
          `Worksheet appears to have data only in header row. ` +
          `Checked rows after row ${headerDetection.headerRowIndex + 1} but found no valid data entries.`
        : `No valid data rows found. Scanned ${scannedRows} rows after headers. ` +
          `Headers: ${headerDetection.headers.join(', ')}. ` +
          `Rows checked: ${extraction.dataRowIndices.join(', ') || '(none)'}. ` +
          `All potential rows were empty or filtered.`

    throw new Error(message)
  }

  return {
    headers: headerDetection.headers,
    rows: extraction.data,
    allSheets: workbook.SheetNames,
    headerRowIndex: headerDetection.headerRowIndex,
    headerDetectionResult: headerDetection,
    extractionResult: extraction,
  }
}

/**
 * Parse CSV file buffer
 */
export function parseCSVFile(buffer: Buffer): Promise<{
  headers: string[]
  rows: Record<string, any>[]
}> {
  const text = buffer.toString('utf-8')

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        resolve({
          headers: headers.map(h => h.trim()),
          rows: results.data as Record<string, any>[],
        })
      },
      error: (error: any) => {
        reject(new Error(`CSV parse error: ${error?.message || 'Unknown error'}`))
      },
    })
  })
}

/**
 * Infer column mapping by matching headers to synonyms
 */
export { inferColumnMappings } from './cap-table-parser/column-normalizer'

/**
 * Get detailed column mapping info with confidence scores
 */
export { getColumnMappingDetails as getDetailedColumnMappings } from './cap-table-parser/column-normalizer'

/**
 * Normalize and validate a single cap table row
 */
export function normalizeCapTableRow(
  rawData: Record<string, any>,
  columnMappings: Record<string, ColumnType>
): {
  normalized: Record<string, any>
  errors: string[]
  warnings: string[]
} {
  const normalized: Record<string, any> = {}

  // Create reverse mapping: header -> column type
  const headerToType = Object.fromEntries(Object.entries(columnMappings).map(([h, t]) => [h, t]))

  // Normalize each field
  for (const [header, columnType] of Object.entries(columnMappings)) {
    if (columnType === 'ignore') continue

    const value = rawData[header]
    if (value === null || value === undefined || value === '') continue

    switch (columnType) {
      case 'shareholder_name':
        normalized.shareholder_name = String(value).trim()
        break

      case 'ownership_percentage':
        normalized.ownership_percentage = parsePercentage(String(value))
        break

      case 'share_count':
        normalized.share_count = parseNumber(String(value))
        break

      case 'investment_amount':
        normalized.investment_amount = parseCurrency(String(value))
        break

      case 'holder_type':
        normalized.holder_type = String(value).toLowerCase()
        break

      case 'security_type':
        normalized.security_type = String(value).toLowerCase()
        break

      case 'issue_date':
        normalized.issue_date = parseDate(String(value))
        break

      case 'conversion_ratio':
        normalized.conversion_ratio = parseNumber(String(value))
        break

      case 'liquidation_preference':
        normalized.liquidation_preference = parseNumber(String(value))
        break

      case 'notes':
        normalized.notes = String(value).trim()
        break
    }
  }

  // Use validation engine for error/warning generation
  const validation = validateRow(0, rawData, headerToType)

  return {
    normalized,
    errors: validation.errors,
    warnings: validation.warnings,
  }
}

// Helper parsing functions
function parsePercentage(value: string): number | null {
  const cleaned = value.replace('%', '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseNumber(value: string): number | null {
  const num = parseFloat(value)
  return isNaN(num) ? null : num
}

function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): string | null {
  const trimmed = dateStr.trim()

  // Try ISO format first
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/
  if (isoRegex.test(trimmed)) {
    return trimmed
  }

  // Try common date formats
  const date = new Date(trimmed)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return null
}

/**
 * Validate cap table for logical consistency
 */
export function validateCapTable(
  rows: ParsedCapTableRow[],
  existingEntries: any[] = []
): {
  globalErrors: string[]
  globalWarnings: string[]
} {
  const result = validateTable(rows)
  return {
    globalErrors: result.globalErrors,
    globalWarnings: result.globalWarnings,
  }
}
