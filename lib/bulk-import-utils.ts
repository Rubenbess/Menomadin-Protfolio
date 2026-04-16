/**
 * Bulk import utilities for CSV and Excel parsing and validation
 */
import * as XLSX from 'xlsx'

export interface ImportResult {
  success: boolean
  total: number
  imported: number
  failed: number
  errors: ImportError[]
  warnings: ImportWarning[]
}

export interface ImportError {
  row: number
  field: string
  message: string
}

export interface ImportWarning {
  row: number
  field: string
  message: string
}

export interface CompanyImportData {
  name: string
  sector?: string
  entry_stage?: string
  hq?: string
  status?: string
  strategy?: string
  totalInvested?: number
  currentValue?: number
  moic?: number
  ownershipPct?: number
}

export interface ContactImportData {
  name: string
  position?: string
  email?: string
  phone?: string
  company_name?: string
  contact_type?: string
  relationship_owner?: string
}

/**
 * Parse CSV file into array of objects
 */
export async function parseCSV(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        const rows = lines.map(line => parseCSVLine(line))
        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Parse Excel file (.xlsx / .xls) into the same string[][] format as parseCSV
 */
export async function parseExcel(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        // header:1 returns raw array-of-arrays; defval fills empty cells with ''
        const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        resolve(rows.map(row => (row as unknown[]).map(cell => String(cell ?? ''))))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read Excel file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse a single CSV line (handles quoted values)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Validate company import data
 */
export function validateCompanyRow(
  row: Record<string, string>,
  rowIndex: number
): { valid: boolean; errors: ImportError[]; warnings: ImportWarning[] } {
  const errors: ImportError[] = []
  const warnings: ImportWarning[] = []

  // Required: name
  if (!row['name'] || row['name'].trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'name',
      message: 'Company name is required',
    })
  }

  // Optional validations
  if (row['totalInvested'] && isNaN(Number(row['totalInvested']))) {
    errors.push({
      row: rowIndex,
      field: 'totalInvested',
      message: 'Total Invested must be a number',
    })
  }

  if (row['currentValue'] && isNaN(Number(row['currentValue']))) {
    errors.push({
      row: rowIndex,
      field: 'currentValue',
      message: 'Current Value must be a number',
    })
  }

  if (row['moic'] && isNaN(Number(row['moic']))) {
    errors.push({
      row: rowIndex,
      field: 'moic',
      message: 'MOIC must be a number',
    })
  }

  if (row['ownershipPct'] && isNaN(Number(row['ownershipPct']))) {
    errors.push({
      row: rowIndex,
      field: 'ownershipPct',
      message: 'Ownership % must be a number',
    })
  }

  // Warnings for missing optional fields
  if (!row['sector']) {
    warnings.push({
      row: rowIndex,
      field: 'sector',
      message: 'Sector not specified (optional)',
    })
  }

  if (!row['entry_stage']) {
    warnings.push({
      row: rowIndex,
      field: 'entry_stage',
      message: 'Entry stage not specified (optional)',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate contact import data
 */
export function validateContactRow(
  row: Record<string, string>,
  rowIndex: number
): { valid: boolean; errors: ImportError[]; warnings: ImportWarning[] } {
  const errors: ImportError[] = []
  const warnings: ImportWarning[] = []

  // Required: name
  if (!row['name'] || row['name'].trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'name',
      message: 'Contact name is required',
    })
  }

  // Email validation
  if (row['email'] && !isValidEmail(row['email'])) {
    errors.push({
      row: rowIndex,
      field: 'email',
      message: 'Invalid email address',
    })
  }

  // Warnings
  if (!row['email']) {
    warnings.push({
      row: rowIndex,
      field: 'email',
      message: 'Email not provided (recommended)',
    })
  }

  if (!row['position']) {
    warnings.push({
      row: rowIndex,
      field: 'position',
      message: 'Position not specified (optional)',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Convert CSV row to company data
 */
export function rowToCompanyData(row: Record<string, string>): CompanyImportData {
  return {
    name: row['name'],
    sector: row['sector'] || undefined,
    entry_stage: row['entry_stage'] || undefined,
    hq: row['hq'] || undefined,
    status: row['status'] || 'active',
    strategy: row['strategy'] || undefined,
    totalInvested: row['totalInvested'] ? Number(row['totalInvested']) : undefined,
    currentValue: row['currentValue'] ? Number(row['currentValue']) : undefined,
    moic: row['moic'] ? Number(row['moic']) : undefined,
    ownershipPct: row['ownershipPct'] ? Number(row['ownershipPct']) : undefined,
  }
}

/**
 * Convert CSV row to contact data
 */
export function rowToContactData(row: Record<string, string>): ContactImportData {
  return {
    name: row['name'],
    position: row['position'] || undefined,
    email: row['email'] || undefined,
    phone: row['phone'] || undefined,
    company_name: row['company_name'] || undefined,
    contact_type: row['contact_type'] || 'other',
    relationship_owner: row['relationship_owner'] || undefined,
  }
}

/**
 * Get expected headers for company import
 */
export function getCompanyHeaders(): string[] {
  return [
    'name',
    'sector',
    'entry_stage',
    'hq',
    'status',
    'strategy',
    'totalInvested',
    'currentValue',
    'moic',
    'ownershipPct',
  ]
}

/**
 * Get expected headers for contact import
 */
export function getContactHeaders(): string[] {
  return [
    'name',
    'position',
    'email',
    'phone',
    'company_name',
    'contact_type',
    'relationship_owner',
  ]
}
