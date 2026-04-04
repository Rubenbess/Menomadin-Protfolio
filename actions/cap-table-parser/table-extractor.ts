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
  // Get sheet range, accounting for files where !ref might be incomplete
  let range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

  // Manually scan for actual used cells in case !ref is wrong
  let maxRow = range.e.r
  let maxCol = range.e.c

  for (const key in worksheet) {
    if (key.startsWith('!')) continue
    try {
      const cellAddr = XLSX.utils.decode_cell(key)
      if (cellAddr.r > maxRow) maxRow = cellAddr.r
      if (cellAddr.c > maxCol) maxCol = cellAddr.c
    } catch (e) {
      // Invalid cell reference, skip
    }
  }

  if (maxRow > range.e.r || maxCol > range.e.c) {
    range = { s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } }
  }

  const dataRowIndices: number[] = []
  const data: Record<string, any>[] = []

  // Process rows after header
  for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
    const rowData = extractRowData(worksheet, row, range)

    // Skip completely empty rows (all cells empty)
    if (rowData.every(cell => !cell)) {
      continue
    }

    // Skip summary/total rows
    if (isSummaryRow(rowData, headers)) {
      continue
    }

    // Check if row has at least SOME content in a meaningful column
    // (typically first column should have a name/identifier)
    if (!rowData[0]) {
      // If first column is empty, row might be continuation or formatting
      // Only skip if truly nothing in the row
      const hasAnyData = rowData.some(cell => cell && cell.toString().trim().length > 0)
      if (!hasAnyData) {
        continue
      }
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
 * Only mark as summary if there's strong evidence, to avoid filtering legitimate data
 */
function isSummaryRow(rowData: string[], headers: string[]): boolean {
  const firstCell = rowData[0] || ''
  const allCells = rowData.join(' ').toLowerCase()

  // Only filter if first cell explicitly indicates summary
  // Check first cell against strong patterns
  if (/^total|^subtotal|^grand total|^sum/i.test(firstCell.trim())) {
    return true
  }

  // Check for "notes:" or "comments:" labels (usually at bottom)
  if (/^notes?:|^comments?:|^source:/i.test(firstCell.trim())) {
    return true
  }

  // Check if row is all dashes or equals (separator row)
  if (/^[=\-_]{3,}$/.test(firstCell.trim()) || rowData.every(cell => /^[=\-_\s]*$/.test(cell))) {
    return true
  }

  // STRICT: Only filter as all-numbers if first cell explicitly says "total"
  // Don't filter just because cells have numbers - that's normal data!
  if (/total|subtotal|sum|all/i.test(firstCell) && rowData.length > 1) {
    const numberCells = rowData.slice(1).filter(cell => /^\d+\.?\d*%?$/.test(cell))
    if (numberCells.length > rowData.slice(1).length * 0.8) {
      return true
    }
  }

  return false
}
