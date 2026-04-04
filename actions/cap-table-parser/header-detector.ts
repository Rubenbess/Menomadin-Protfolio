// Header Detector - Intelligently finds header row in sheet
import * as XLSX from 'xlsx'

export interface HeaderDetectionResult {
  headerRowIndex: number
  headers: string[]
  confidence: number // 0-100
  reasoning: string
}

// Keywords that commonly appear in cap table headers
const HEADER_KEYWORDS = [
  'name',
  'shareholder',
  'investor',
  'entity',
  'holder',
  'party',
  'shares',
  'ownership',
  'percent',
  'amount',
  'investment',
  'type',
  'security',
  'class',
  'date',
  'issue',
  'series',
  'conversion',
  'liquidation',
  'notes',
  'memo',
  'comments',
  'strike',
  'price',
  'vested',
  'granted',
  'exercise',
]

/**
 * Detect header row by scanning first 50 rows
 */
export function detectHeaderRow(worksheet: XLSX.WorkSheet): HeaderDetectionResult {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  const maxRowsToCheck = Math.min(50, range.e.r - range.s.r + 1)

  let bestResult: HeaderDetectionResult | null = null
  let bestScore = 0

  // Check first N rows as potential headers
  for (let row = range.s.r; row < range.s.r + maxRowsToCheck; row++) {
    const rowData = extractRowData(worksheet, row, range)

    // Skip completely empty rows
    if (rowData.every(cell => !cell)) {
      continue
    }

    const headers = normalizeHeaders(rowData)
    const score = scoreHeaderRow(headers)

    if (score > bestScore) {
      bestScore = score
      bestResult = {
        headerRowIndex: row,
        headers,
        confidence: Math.min(100, score),
        reasoning: generateReasoning(headers, score),
      }
    }
  }

  // If we found any candidate, return it (even with low score)
  if (bestResult) {
    // Boost confidence for fallback cases
    if (bestScore < 20) {
      bestResult.confidence = Math.max(15, bestResult.confidence)
      bestResult.reasoning = 'Fallback: First non-empty row used as headers (low confidence - please verify)'
    } else if (bestScore < 40) {
      bestResult.confidence = Math.max(30, bestResult.confidence)
      bestResult.reasoning = 'Detected likely headers (low-medium confidence)'
    }
    return bestResult
  }

  // Last resort: create generic headers
  return {
    headerRowIndex: 0,
    headers: createGenericHeaders(range.e.c - range.s.c + 1),
    confidence: 0,
    reasoning: 'No valid headers found; using generic Column1, Column2, etc.',
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
 * Normalize headers: clean whitespace, line breaks, etc.
 */
function normalizeHeaders(rawHeaders: string[]): string[] {
  return rawHeaders.map(header => {
    // Collapse whitespace and line breaks
    const normalized = header
      .replace(/[\r\n]+/g, ' ') // Replace line breaks with space
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim()

    return normalized.length > 0 ? normalized : `Column${rawHeaders.indexOf(header) + 1}`
  })
}

/**
 * Score how likely a row is to be headers
 * Scoring factors:
 * - Presence of common header keywords
 * - Column count (should be reasonable, not 1)
 * - Number of cells with content (sparse rows are bad)
 * - Absence of numbers (headers are usually text)
 * - Absence of special characters (usually indicates data)
 */
function scoreHeaderRow(headers: string[]): number {
  let score = 0

  // Base score: any non-empty row that could be headers
  const nonEmptyCount = headers.filter(h => h.length > 0).length
  if (nonEmptyCount > 0) {
    score = 5 // Base score for having any content
  }

  // Bonus for having multiple columns
  if (headers.length > 2) {
    score += 8
  }

  if (headers.length > 5) {
    score += 5 // More columns = more likely to be real headers
  }

  // Check for header keywords
  const headerText = headers.join(' ').toLowerCase()
  let keywordMatches = 0

  HEADER_KEYWORDS.forEach(keyword => {
    if (headerText.includes(keyword)) {
      keywordMatches++
      score += 8
    }
  })

  // Bonus if multiple keywords matched
  if (keywordMatches >= 1) {
    score += 10
  }
  if (keywordMatches >= 2) {
    score += 15
  }
  if (keywordMatches >= 4) {
    score += 25
  }

  // Check for data-like content (numbers, special patterns)
  let numberCount = 0
  let totalNonEmpty = 0

  headers.forEach(header => {
    if (header) {
      totalNonEmpty++
      // Check if looks like a pure number or percentage
      if (/^\d+\.?\d*%?$/.test(header)) {
        numberCount++
      }
    }
  })

  // Penalize if MOSTLY numbers (likely data row), but not too harshly
  if (numberCount > totalNonEmpty * 0.7) {
    score -= 15
  } else if (numberCount > totalNonEmpty * 0.5) {
    score -= 5
  }

  // Bonus for high cell density (most cells filled)
  const filledRatio = totalNonEmpty / headers.length
  if (filledRatio > 0.8) {
    score += 10
  } else if (filledRatio > 0.6) {
    score += 5
  }

  // Check for suspicious patterns that indicate data rows
  if (looksLikeDataRow(headers)) {
    score -= 25
  }

  return Math.max(0, score)
}

/**
 * Check if a row looks like data rather than headers
 */
function looksLikeDataRow(headers: string[]): boolean {
  // If first column looks like a person/entity name and has numbers after it, likely data
  if (headers.length > 1 && headers[0]) {
    const firstCell = headers[0]
    const secondCell = headers[1]

    // Pattern: "John Smith" followed by number = likely data
    if (firstCell.match(/^[A-Z][a-z]+ [A-Z][a-z]+/) && secondCell?.match(/^\d+\.?\d*%?$/)) {
      return true
    }
  }

  // If all cells are numbers, definitely data
  if (headers.every(h => h.match(/^\d+\.?\d*%?$/))) {
    return true
  }

  return false
}

/**
 * Generate human-readable reasoning for score
 */
function generateReasoning(headers: string[], score: number): string {
  const reasons: string[] = []

  if (headers.length > 2) {
    reasons.push(`${headers.length} columns detected`)
  }

  const headerText = headers.join(' ').toLowerCase()
  const matchedKeywords = HEADER_KEYWORDS.filter(kw => headerText.includes(kw))

  if (matchedKeywords.length > 0) {
    reasons.push(`Keywords matched: ${matchedKeywords.slice(0, 3).join(', ')}`)
  }

  if (score > 50) {
    reasons.push('High confidence')
  } else if (score > 30) {
    reasons.push('Medium confidence')
  } else {
    reasons.push('Low confidence')
  }

  return reasons.join('; ')
}

/**
 * Create generic column headers as fallback
 */
function createGenericHeaders(columnCount: number): string[] {
  const headers: string[] = []
  for (let i = 0; i < columnCount; i++) {
    headers.push(`Column${i + 1}`)
  }
  return headers
}
