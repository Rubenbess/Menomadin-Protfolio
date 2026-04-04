// Column Normalizer - Maps headers to field types with smart synonym matching
import type { ColumnType } from '@/lib/types'

export interface ColumnMapping {
  originalHeader: string
  normalizedHeader: string
  fieldType: ColumnType
  confidence: number // 0-100
  matchedSynonym: string
}

// Enhanced synonym dictionary with 50+ terms
const COLUMN_SYNONYMS: Record<ColumnType, string[]> = {
  shareholder_name: [
    'name',
    'shareholder',
    'investor',
    'holder',
    'party',
    'entity',
    'founder',
    'investor name',
    'shareholder name',
    'holder name',
    'investor/entity',
    'who',
    'individual',
    'company',
    'legal entity',
  ],
  ownership_percentage: [
    'ownership',
    'ownership %',
    'ownership_pct',
    '% ownership',
    'pct',
    'percent',
    'percentage',
    'ownership percentage',
    'pct ownership',
    '% owned',
    'stake',
    'equity %',
    'equity percentage',
    'diluted %',
  ],
  share_count: [
    'shares',
    'share count',
    'common shares',
    'issued shares',
    '# shares',
    'num shares',
    'number of shares',
    'common stock',
    'shares owned',
    'share #',
    'share amount',
    'qty',
    'quantity',
    'shares outstanding',
  ],
  investment_amount: [
    'amount',
    'investment',
    'invested',
    'investment amount',
    '$',
    'usd',
    'price',
    'consideration',
    'invested amount',
    'investment $',
    'capital',
    'amount invested',
    'check size',
    'purchase price',
    'strike',
  ],
  holder_type: [
    'type',
    'holder type',
    'investor type',
    'category',
    'investor category',
    'party type',
    'entity type',
    'class of holder',
    'holder category',
    'investor class',
    'role',
    'status',
  ],
  security_type: [
    'security',
    'security type',
    'instrument',
    'class',
    'security class',
    'class of security',
    'stock class',
    'series',
    'instrument type',
    'security instrument',
    'preferred class',
    'stock',
  ],
  issue_date: [
    'date issued',
    'issue date',
    'issued',
    'date',
    'grant date',
    'issuance date',
    'date granted',
    'effective date',
    'close date',
    'investment date',
    'purchase date',
    'date acquired',
  ],
  conversion_ratio: [
    'conversion',
    'conversion ratio',
    'exercise price',
    'strike price',
    'conversion price',
    'exercise',
    'strike',
    'price per share',
    'conversion factor',
    'ratio',
  ],
  liquidation_preference: [
    'liquidation pref',
    'liquidation',
    'preference',
    'seniority',
    'liquidation preference',
    'pref',
    'liquidation multiple',
    'preference multiple',
    'participating',
  ],
  notes: [
    'notes',
    'memo',
    'comments',
    'description',
    'remarks',
    'comments/notes',
    'note',
    'notes/comments',
    'comment',
    'detail',
    'info',
  ],
  ignore: [],
}

/**
 * Infer column mappings with enhanced matching
 */
export function inferColumnMappings(headers: string[]): Record<string, ColumnType> {
  const mappings: Record<string, ColumnType> = {}

  for (const header of headers) {
    const mapping = inferColumnType(header)
    mappings[header] = mapping
  }

  return mappings
}

/**
 * Infer column type for a single header with detailed matching
 */
function inferColumnType(header: string): ColumnType {
  const normalized = normalizeHeaderForMatching(header)
  const matches = findMatches(normalized)

  // If no matches, mark as ignore
  if (matches.length === 0) {
    return 'ignore'
  }

  // Return best match
  return matches[0].fieldType
}

/**
 * Normalize header text for matching: handle line breaks, extra whitespace, etc.
 */
function normalizeHeaderForMatching(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\r\n]+/g, ' ') // Replace line breaks with space
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}

/**
 * Find matching column types for a header
 */
interface Match {
  fieldType: ColumnType
  matchedSynonym: string
  score: number
}

function findMatches(normalizedHeader: string): Match[] {
  const matches: Match[] = []

  for (const [columnType, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
    for (const synonym of synonyms) {
      const score = calculateMatchScore(normalizedHeader, synonym)
      if (score > 0) {
        matches.push({
          fieldType: columnType as ColumnType,
          matchedSynonym: synonym,
          score,
        })
      }
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score)

  return matches
}

/**
 * Calculate match score between header and synonym
 * Exact matches score highest, substring matches score lower
 */
function calculateMatchScore(header: string, synonym: string): number {
  // Exact match
  if (header === synonym) {
    return 100
  }

  // Header contains synonym as whole word
  if (header.split(/\s+/).includes(synonym)) {
    return 90
  }

  // Synonym contains header as substring
  if (synonym.includes(header) && header.length >= 3) {
    return 70
  }

  // Header contains synonym as substring
  if (header.includes(synonym)) {
    // Score based on synonym length (longer = more specific)
    const lengthBonus = Math.min(30, synonym.length * 2)
    return 50 + lengthBonus
  }

  // Fuzzy match: similar but not exact
  if (similarStrings(header, synonym)) {
    return 30
  }

  return 0
}

/**
 * Fuzzy string similarity check
 */
function similarStrings(str1: string, str2: string): boolean {
  // Remove common abbreviations and check
  const normalize = (s: string) => s.replace(/[_%&$]/g, '').replace(/ +/g, '')
  return normalize(str1) === normalize(str2)
}

/**
 * Get detailed column mapping info
 */
export function getColumnMappingDetails(
  headers: string[]
): Record<string, ColumnMapping> {
  const details: Record<string, ColumnMapping> = {}

  for (const header of headers) {
    const normalizedHeader = normalizeHeaderForMatching(header)
    const matches = findMatches(normalizedHeader)

    if (matches.length > 0) {
      const bestMatch = matches[0]
      details[header] = {
        originalHeader: header,
        normalizedHeader,
        fieldType: bestMatch.fieldType,
        confidence: Math.min(100, bestMatch.score),
        matchedSynonym: bestMatch.matchedSynonym,
      }
    } else {
      details[header] = {
        originalHeader: header,
        normalizedHeader,
        fieldType: 'ignore',
        confidence: 0,
        matchedSynonym: '',
      }
    }
  }

  return details
}
