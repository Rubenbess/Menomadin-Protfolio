// Table Extractor - Finds data rows and filters totals/summaries
import * as XLSX from 'xlsx'

export interface ExtractionResult {
  headerRowIndex: number
  dataRowIndices: number[]
  filteredRowCount: number
  data: Record<string, any>[]
}

// Patterns that indicate a row is a total/summary row
const SUMMARY_ROW_PATTERNS = [
  /^total/i,
  /^subtotal/i,
  /^grand total/i,
  /^sum/i,
  /^average/i,
  /^notes?:/i,
  /^comments?:/i,
  /^source:/i,
  /^\*/,
  /^----+/,
  /^====+/,
]

/**
 * Extract data rows from worksheet after headers
 */
export function extractTableData(
  worksheet: XLSX.WorkSheet,
  headers: string[],
  headerRowIndex: number
): ExtractionResult {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  const dataRowIndices: number[] = []
  const data: Record<string, any>[] = []

  // Process rows after header
  for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
    const rowData = extractRowData(worksheet, row, range)

    // Skip completely empty rows
    if (rowData.every(cell => !cell)) {
      continue
    }

    // Skip summary/total rows
    if (isSummaryRow(rowData, headers)) {
      continue
    }

    // Convert to object using headers
    const rowObj: Record<string, any> = {}
    headers.forEach((header, idx) => {
      rowObj[header] = rowData[idx] || null
    })

    dataRowIndices.push(row)
    data.push(rowObj)
  }

  return {
    headerRowIndex,
    dataRowIndices,
    filteredRowCount: range.e.r - headerRowIndex - 1,
    data,
  }
}

/**
 * Extract raw cell values from a row
 */
function extractRowData(worksheet: XLSX.WorkSheet, rowIndex: number, range: XLSX.Range): string[] {
  const data: string[] = []

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: col })
    const cell = worksheet[cellRef]

    if (cell && cell.v !== null && cell.v !== undefined) {
      const value = String(cell.v).trim()
      data.push(value)
    } else {
      data.push('')
    }
  }

  return data
}

/**
 * Determine if a row is a summary/total row
 */
function isSummaryRow(rowData: string[], headers: string[]): boolean {
  const firstCell = rowData[0] || ''
  const allCells = rowData.join(' ').toLowerCase()

  // Check first cell against patterns
  if (SUMMARY_ROW_PATTERNS.some(pattern => pattern.test(firstCell))) {
    return true
  }

  // Check if first cell is a known summary keyword
  if (/^(total|subtotal|sum|average)$/i.test(firstCell.trim())) {
    return true
  }

  // Check if all non-first cells are numbers (likely a total row)
  if (rowData.length > 1) {
    const numberCells = rowData.slice(1).filter(cell => /^\d+\.?\d*%?$/.test(cell))
    if (numberCells.length > rowData.slice(1).length * 0.7) {
      // Check if first cell looks like a summary label
      if (/total|sum|subtotal|all/i.test(firstCell)) {
        return true
      }
    }
  }

  // Check for multiple consecutive empty cells followed by a number (often indicates summary)
  let emptyCount = 0
  for (let i = 0; i < rowData.length - 1; i++) {
    if (!rowData[i]) {
      emptyCount++
    } else if (/^\d+\.?\d*%?$/.test(rowData[i])) {
      if (emptyCount > 2) {
        return true
      }
      emptyCount = 0
    } else {
      emptyCount = 0
    }
  }

  return false
}
