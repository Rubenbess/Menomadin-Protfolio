// Validation Engine - Row and table-level validation with errors vs warnings
import type { ParsedCapTableRow } from '@/lib/types'

export interface ValidationResult {
  isValid: boolean // No blocking errors
  errors: string[] // Blocking errors
  warnings: string[] // Non-blocking warnings
  confidence: number // 0-100
}

export interface TableValidationResult {
  globalErrors: string[]
  globalWarnings: string[]
  confidence: number
}

/**
 * Validate a single row
 */
export function validateRow(
  rowIndex: number,
  data: Record<string, any>,
  columnMappings: Record<string, string>
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let confidence = 100

  // Check required fields
  const shareholderName = extractValue(data, columnMappings, 'shareholder_name')
  if (!shareholderName || shareholderName.toString().trim() === '') {
    errors.push('Shareholder name is required')
    confidence = 0
  }

  // Validate ownership percentage if present
  const ownershipStr = extractValue(data, columnMappings, 'ownership_percentage')
  if (ownershipStr) {
    const ownership = parsePercentage(ownershipStr)
    if (ownership === null) {
      errors.push(`Invalid ownership percentage: "${ownershipStr}"`)
      confidence -= 20
    } else {
      if (ownership < 0 || ownership > 100) {
        warnings.push(`Ownership ${ownership}% is outside 0-100 range`)
        confidence -= 5
      }
    }
  }

  // Validate share count if present
  const shareCountStr = extractValue(data, columnMappings, 'share_count')
  if (shareCountStr) {
    const shares = parseNumber(shareCountStr)
    if (shares === null) {
      warnings.push(`Invalid share count: "${shareCountStr}"`)
      confidence -= 10
    } else if (shares < 0) {
      warnings.push(`Share count ${shares} is negative`)
      confidence -= 5
    }
  }

  // Validate investment amount if present
  const amountStr = extractValue(data, columnMappings, 'investment_amount')
  if (amountStr) {
    const amount = parseCurrency(amountStr)
    if (amount === null) {
      warnings.push(`Invalid investment amount: "${amountStr}"`)
      confidence -= 10
    } else if (amount < 0) {
      warnings.push(`Investment amount ${amount} is negative`)
      confidence -= 5
    }
  }

  // Validate date if present
  const dateStr = extractValue(data, columnMappings, 'issue_date')
  if (dateStr) {
    const date = parseDate(dateStr)
    if (!date) {
      warnings.push(`Could not parse issue date: "${dateStr}"`)
      confidence -= 10
    }
  }

  // Validate holder type if present
  const holderType = extractValue(data, columnMappings, 'holder_type')
  if (holderType) {
    const valid = ['founder', 'investor', 'employee', 'advisor', 'other']
    if (!valid.includes(holderType.toString().toLowerCase())) {
      warnings.push(`Unknown holder type: "${holderType}" (expected: founder, investor, employee, advisor, other)`)
      confidence -= 5
    }
  }

  // Validate security type if present
  const securityType = extractValue(data, columnMappings, 'security_type')
  if (securityType) {
    const valid = ['common', 'preferred', 'options', 'warrant', 'safe']
    if (!valid.includes(securityType.toString().toLowerCase())) {
      warnings.push(`Unknown security type: "${securityType}" (expected: common, preferred, options, warrant, safe)`)
      confidence -= 5
    }
  }

  // Ensure confidence is non-negative
  confidence = Math.max(0, confidence)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    confidence: Math.round(confidence),
  }
}

/**
 * Validate entire table
 */
export function validateTable(rows: ParsedCapTableRow[]): TableValidationResult {
  const globalErrors: string[] = []
  const globalWarnings: string[] = []
  let totalRows = rows.length

  if (totalRows === 0) {
    globalErrors.push('No data rows found in table')
    return { globalErrors, globalWarnings, confidence: 0 }
  }

  // Check total ownership (if many rows have ownership %)
  const rowsWithOwnership = rows.filter(r => r.normalized_data.ownership_percentage)
  if (rowsWithOwnership.length > 2) {
    const totalOwnership = rowsWithOwnership.reduce((sum, r) => sum + (r.normalized_data.ownership_percentage || 0), 0)

    if (totalOwnership > 0) {
      if (Math.abs(totalOwnership - 100) > 2) {
        globalWarnings.push(
          `Total ownership is ${totalOwnership.toFixed(2)}% (expected ~100%). This may indicate incomplete data or additional classes of stock.`
        )
      }
    }
  }

  // Check for duplicate shareholders
  const names = rows
    .map(r => r.normalized_data.shareholder_name)
    .filter(Boolean)
    .map(n => n?.toLowerCase())

  const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx)
  if (duplicates.length > 0) {
    globalWarnings.push(
      `Duplicate shareholders found: ${[...new Set(duplicates)].join(', ')}. Verify these are not duplicates.`
    )
  }

  // Check for rows with only errors
  const errorRows = rows.filter(r => (r.validation_errors || []).length > 0)
  if (errorRows.length === totalRows) {
    globalErrors.push(`All ${totalRows} rows have validation errors and cannot be imported`)
  } else if (errorRows.length > totalRows * 0.5) {
    globalWarnings.push(
      `${errorRows.length}/${totalRows} rows have errors and will be skipped during import`
    )
  }

  // Check for missing critical data
  const withoutOwnership = rows.filter(r => !r.normalized_data.ownership_percentage)
  if (withoutOwnership.length > 0 && withoutOwnership.length < totalRows) {
    globalWarnings.push(
      `${withoutOwnership.length} rows missing ownership percentage. These will be included but with incomplete data.`
    )
  }

  // Calculate confidence
  let confidence = 100
  if (globalErrors.length > 0) {
    confidence = 20
  } else if (globalWarnings.length > 2) {
    confidence = 60
  } else if (globalWarnings.length > 0) {
    confidence = 80
  }

  return { globalErrors, globalWarnings, confidence }
}

/**
 * Helper: Extract value for a field type from row data
 */
function extractValue(
  data: Record<string, any>,
  columnMappings: Record<string, string>,
  fieldType: string
): any {
  const columnName = Object.entries(columnMappings).find(([_, type]) => type === fieldType)?.[0]
  return columnName ? data[columnName] : null
}

/**
 * Parse percentage value
 */
function parsePercentage(value: string): number | null {
  const cleaned = value.toString().replace('%', '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse number value
 */
function parseNumber(value: string): number | null {
  const num = parseFloat(value.toString())
  return isNaN(num) ? null : num
}

/**
 * Parse currency value
 */
function parseCurrency(value: string): number | null {
  const cleaned = value.toString().replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse date value
 */
function parseDate(value: string): string | null {
  const trimmed = value.toString().trim()

  // Try ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // Try parsing with Date constructor
  const date = new Date(trimmed)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return null
}
