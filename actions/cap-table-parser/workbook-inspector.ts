// Workbook Inspector - Analyzes workbook structure and scores sheets
import * as XLSX from 'xlsx'

export interface SheetMetadata {
  name: string
  index: number
  rowCount: number
  columnCount: number
  isHidden: boolean
  hasMergedCells: boolean
  hasFormulas: boolean
  sampleHeaders?: string[]
}

export interface WorkbookAnalysis {
  sheets: SheetMetadata[]
  scoredSheets: Array<{ sheet: SheetMetadata; score: number; matchedKeywords: string[] }>
  primarySheetIndex: number | null
  hasMultipleCapTableSheets: boolean
}

// Keywords that indicate a sheet is likely a cap table
const CAP_TABLE_KEYWORDS = [
  'cap',
  'capitalization',
  'cap table',
  'ownership',
  'shareholder',
  'shares',
  'equity',
  'stock',
  'series',
  'preferred',
  'common',
]

const FULLY_DILUTED_KEYWORDS = ['fully diluted', 'fd', 'diluted', 'fully-diluted']
const OPTIONS_KEYWORDS = ['option', 'esop', 'pool', 'granted', 'vested']
const WARRANT_KEYWORDS = ['warrant', 'convertible']
const SAFE_KEYWORDS = ['safe', 'safes', 'simple agreement']

/**
 * Inspect workbook and extract sheet metadata
 */
export function inspectWorkbook(workbook: XLSX.WorkBook): WorkbookAnalysis {
  const sheets = workbook.SheetNames.map((name, index) => {
    const worksheet = workbook.Sheets[name]
    const metadata = extractSheetMetadata(name, index, worksheet)
    return metadata
  })

  // Score sheets for relevance to cap table parsing
  const scoredSheets = sheets.map(sheet => {
    const score = scoreSheetForCapTable(sheet.name, sheet.sampleHeaders || [])
    const matchedKeywords = extractMatchedKeywords(sheet.name, sheet.sampleHeaders || [])
    return { sheet, score, matchedKeywords }
  })

  // Sort by score descending
  scoredSheets.sort((a, b) => b.score - a.score)

  // Primary sheet is highest scoring cap table sheet
  const primarySheetIndex = scoredSheets[0]?.score > 0 ? sheets.indexOf(scoredSheets[0].sheet) : null

  // Check if there are multiple cap table candidates
  const capTableSheets = scoredSheets.filter(({ sheet, score }) => score > 30)
  const hasMultipleCapTableSheets = capTableSheets.length > 1

  return {
    sheets,
    scoredSheets,
    primarySheetIndex,
    hasMultipleCapTableSheets,
  }
}

/**
 * Extract metadata from a single sheet
 */
function extractSheetMetadata(name: string, index: number, worksheet: XLSX.WorkSheet): SheetMetadata {
  // Get sheet dimensions - CRITICAL: worksheet['!ref'] might be missing or incorrect
  const rangeStr = worksheet['!ref'] || 'A1'
  let range
  try {
    range = XLSX.utils.decode_range(rangeStr)
  } catch (e) {
    // If decode fails, use A1 as default
    range = XLSX.utils.decode_range('A1')
  }

  const rowCount = range.e.r - range.s.r + 1
  const columnCount = range.e.c - range.s.c + 1

  // Extract sample headers (first few rows as potential headers)
  const sampleHeaders = extractSampleHeaders(worksheet, 10)

  // Check for merged cells and formulas
  const hasMergedCells = (worksheet['!merges'] && worksheet['!merges'].length > 0) || false
  const hasFormulas = Object.keys(worksheet).some(
    key => key !== '!ref' && key !== '!merges' && typeof worksheet[key] === 'object' && worksheet[key].f
  )

  return {
    name,
    index,
    rowCount,
    columnCount,
    isHidden: false, // Would need workbook structure metadata to detect
    hasMergedCells,
    hasFormulas,
    sampleHeaders,
  }
}

/**
 * Extract potential headers from first N rows
 */
function extractSampleHeaders(worksheet: XLSX.WorkSheet, numRows: number): string[] {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  const headers: string[] = []

  for (let row = range.s.r; row <= Math.min(range.s.r + numRows, range.e.r); row++) {
    const rowValues: string[] = []
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = worksheet[cellRef]
      const value = cell ? String(cell.v || '').trim() : ''
      rowValues.push(value)
    }

    // If row has content, add as potential header
    if (rowValues.some(v => v.length > 0)) {
      headers.push(rowValues.join(' | '))
    }
  }

  return headers
}

/**
 * Score a sheet for likelihood of being a cap table
 * Higher score = more likely to be cap table
 */
function scoreSheetForCapTable(sheetName: string, sampleHeaders: string[]): number {
  let score = 0
  const lowerName = sheetName.toLowerCase()
  const headerText = sampleHeaders.join(' ').toLowerCase()

  // Name-based scoring (higher weight)
  if (CAP_TABLE_KEYWORDS.some(kw => lowerName.includes(kw))) {
    score += 100
  } else if (FULLY_DILUTED_KEYWORDS.some(kw => lowerName.includes(kw))) {
    score += 60
  } else if (OPTIONS_KEYWORDS.some(kw => lowerName.includes(kw))) {
    score += 40
  } else if (WARRANT_KEYWORDS.some(kw => lowerName.includes(kw))) {
    score += 20
  } else if (SAFE_KEYWORDS.some(kw => lowerName.includes(kw))) {
    score += 20
  }

  // Header-based scoring (lower weight, but important signal)
  CAP_TABLE_KEYWORDS.forEach(kw => {
    if (headerText.includes(kw)) {
      score += 15
    }
  })

  FULLY_DILUTED_KEYWORDS.forEach(kw => {
    if (headerText.includes(kw)) {
      score += 10
    }
  })

  // Penalize generic names
  if (lowerName === 'sheet1' || lowerName === 'sheet' || lowerName === 'data') {
    score = Math.max(0, score - 10)
  }

  return score
}

/**
 * Extract keywords that matched this sheet
 */
function extractMatchedKeywords(sheetName: string, sampleHeaders: string[]): string[] {
  const matched: string[] = []
  const lowerName = sheetName.toLowerCase()
  const headerText = sampleHeaders.join(' ').toLowerCase()

  const checkKeywords = (keywords: string[], category: string) => {
    keywords.forEach(kw => {
      if (lowerName.includes(kw) || headerText.includes(kw)) {
        if (!matched.includes(kw)) {
          matched.push(kw)
        }
      }
    })
  }

  checkKeywords(CAP_TABLE_KEYWORDS, 'cap-table')
  checkKeywords(FULLY_DILUTED_KEYWORDS, 'fully-diluted')
  checkKeywords(OPTIONS_KEYWORDS, 'options')
  checkKeywords(WARRANT_KEYWORDS, 'warrants')
  checkKeywords(SAFE_KEYWORDS, 'safes')

  return matched
}
