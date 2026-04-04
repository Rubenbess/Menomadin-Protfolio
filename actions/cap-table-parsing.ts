// Helper functions for cap table parsing
// These are pure utilities that work on both client and server

import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import type { ParsedCapTableRow, ColumnType } from '@/lib/types'

const COLUMN_SYNONYMS: Record<ColumnType, string[]> = {
  shareholder_name: ['name', 'shareholder', 'investor', 'holder', 'party', 'entity'],
  ownership_percentage: ['ownership', 'ownership %', 'ownership_pct', '% ownership', 'pct', 'percentage'],
  share_count: ['shares', 'share count', 'common shares', 'issued shares', '# shares'],
  investment_amount: ['amount', 'investment', 'invested', 'investment amount', '$', 'usd'],
  holder_type: ['type', 'holder type', 'investor type', 'category'],
  security_type: ['security', 'security type', 'instrument', 'class'],
  issue_date: ['date issued', 'issue date', 'issued', 'date', 'grant date'],
  conversion_ratio: ['conversion', 'conversion ratio', 'exercise price'],
  liquidation_preference: ['liquidation pref', 'liquidation', 'preference', 'seniority'],
  notes: ['notes', 'memo', 'comments', 'description'],
  ignore: [],
}

/**
 * Detect sheets in workbook and classify them
 */
export function detectWorkbookSheets(workbook: XLSX.WorkBook): {
  sheets: Array<{ name: string; type: string; rowCount: number }>
  primaryCapTableSheet: string | null
} {
  const sheets = workbook.SheetNames.map(name => {
    const worksheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    // Classify sheet type by name
    const lowerName = name.toLowerCase()
    let type = 'other'
    if (lowerName.includes('cap') || lowerName.includes('capitalization') || lowerName.includes('ownership')) {
      type = 'cap_table'
    } else if (lowerName.includes('fully diluted') || lowerName.includes('fd')) {
      type = 'fully_diluted'
    } else if (lowerName.includes('option')) {
      type = 'options'
    } else if (lowerName.includes('warrant')) {
      type = 'warrants'
    }

    return {
      name,
      type,
      rowCount: Math.max(0, rows.length - 1), // -1 for header
    }
  })

  const primaryCapTableSheet = sheets.find(s => s.type === 'cap_table')?.name ?? sheets[0]?.name ?? null

  return { sheets, primaryCapTableSheet }
}

/**
 * Parse Excel file buffer and extract sheet data
 */
export function parseExcelFile(buffer: Buffer, sheetName?: string): {
  headers: string[]
  rows: Record<string, any>[]
  allSheets: string[]
} {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel file has no sheets')
  }

  const targetSheet = sheetName || workbook.SheetNames[0]
  const worksheet = workbook.Sheets[targetSheet]

  if (!worksheet) {
    throw new Error(`Sheet "${targetSheet}" not found in workbook`)
  }

  // Use XLSX's built-in JSON conversion - it handles most cases well
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[]

  if (!jsonData || jsonData.length === 0) {
    // Fallback: try header: 1 mode and convert manually
    const arrayData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (!arrayData || arrayData.length < 2) {
      throw new Error('Excel file contains no data rows')
    }

    const headers = (arrayData[0] || []).map(h => String(h || '').trim())
    const fallbackRows = arrayData
      .slice(1)
      .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
      .map(row => {
        const obj: Record<string, any> = {}
        headers.forEach((h, i) => {
          obj[h || `Column${i}`] = row[i] ?? null
        })
        return obj
      })

    if (fallbackRows.length === 0) {
      throw new Error('Excel file has headers but no valid data rows')
    }

    return {
      headers,
      rows: fallbackRows,
      allSheets: workbook.SheetNames,
    }
  }

  // Extract headers from first row keys
  const headers = Object.keys(jsonData[0])

  return {
    headers,
    rows: jsonData,
    allSheets: workbook.SheetNames,
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
export function inferColumnMappings(headers: string[]): Record<string, ColumnType> {
  const mappings: Record<string, ColumnType> = {}

  for (const header of headers) {
    const lowerHeader = header.toLowerCase()
    let bestMatch: ColumnType = 'ignore'
    let bestScore = 0

    for (const [columnType, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
      for (const synonym of synonyms) {
        if (lowerHeader === synonym || lowerHeader.includes(synonym)) {
          const score = synonym.length // Longer matches are more specific
          if (score > bestScore) {
            bestScore = score
            bestMatch = columnType as ColumnType
          }
        }
      }
    }

    mappings[header] = bestMatch
  }

  return mappings
}

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
  const errors: string[] = []
  const warnings: string[] = []

  // Map columns to normalized fields
  for (const [header, columnType] of Object.entries(columnMappings)) {
    if (columnType === 'ignore') continue

    const value = rawData[header]
    if (value === null || value === undefined || value === '') continue

    switch (columnType) {
      case 'shareholder_name':
        normalized.shareholder_name = String(value).trim()
        if (!normalized.shareholder_name) {
          errors.push('Shareholder name is required')
        }
        break

      case 'ownership_percentage':
        const pctVal = parseFloat(String(value).replace('%', ''))
        if (isNaN(pctVal)) {
          errors.push(`Invalid ownership percentage: "${value}"`)
        } else {
          normalized.ownership_percentage = pctVal
          if (pctVal < 0 || pctVal > 100) {
            warnings.push(`Ownership percentage ${pctVal}% is outside 0-100 range`)
          }
        }
        break

      case 'share_count':
        const shareVal = parseFloat(String(value))
        if (isNaN(shareVal)) {
          errors.push(`Invalid share count: "${value}"`)
        } else {
          normalized.share_count = shareVal
        }
        break

      case 'investment_amount':
        const investVal = parseFloat(String(value).replace(/[$,]/g, ''))
        if (isNaN(investVal)) {
          errors.push(`Invalid investment amount: "${value}"`)
        } else {
          normalized.investment_amount = investVal
        }
        break

      case 'holder_type':
        const holderType = String(value).toLowerCase()
        if (['founder', 'investor', 'employee', 'advisor', 'other'].includes(holderType)) {
          normalized.holder_type = holderType
        } else {
          warnings.push(`Unknown holder type: "${value}"`)
        }
        break

      case 'security_type':
        const secType = String(value).toLowerCase()
        if (['common', 'preferred', 'options', 'warrant', 'safe'].includes(secType)) {
          normalized.security_type = secType
        } else {
          warnings.push(`Unknown security type: "${value}"`)
        }
        break

      case 'issue_date':
        const dateVal = parseDate(String(value))
        if (!dateVal) {
          warnings.push(`Could not parse issue date: "${value}"`)
        } else {
          normalized.issue_date = dateVal
        }
        break

      case 'conversion_ratio':
        const convVal = parseFloat(String(value))
        if (isNaN(convVal)) {
          warnings.push(`Invalid conversion ratio: "${value}"`)
        } else {
          normalized.conversion_ratio = convVal
        }
        break

      case 'liquidation_preference':
        const liqVal = parseFloat(String(value))
        if (isNaN(liqVal)) {
          warnings.push(`Invalid liquidation preference: "${value}"`)
        } else {
          normalized.liquidation_preference = liqVal
        }
        break

      case 'notes':
        normalized.notes = String(value).trim()
        break
    }
  }

  // Validate required fields
  if (!normalized.shareholder_name) {
    errors.push('Shareholder name is required')
  }

  return { normalized, errors, warnings }
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
  const globalErrors: string[] = []
  const globalWarnings: string[] = []

  // Check total ownership
  const totalOwnership = rows.reduce((sum, row) => {
    const pct = row.normalized_data.ownership_percentage || 0
    return sum + pct
  }, 0)

  if (totalOwnership > 0 && Math.abs(totalOwnership - 100) > 1) {
    globalWarnings.push(
      `Total ownership is ${totalOwnership.toFixed(2)}% (expected ~100%)`
    )
  }

  // Check for duplicate shareholders
  const names = rows
    .map(r => r.normalized_data.shareholder_name)
    .filter(Boolean)
  const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx)
  if (duplicates.length > 0) {
    globalWarnings.push(`Duplicate shareholders found: ${[...new Set(duplicates)].join(', ')}`)
  }

  // Check for missing critical data
  const withoutOwnership = rows.filter(r => !r.normalized_data.ownership_percentage)
  if (withoutOwnership.length > 0) {
    globalWarnings.push(`${withoutOwnership.length} rows missing ownership percentage`)
  }

  return { globalErrors, globalWarnings }
}
