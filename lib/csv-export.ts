/**
 * Export data as CSV file
 */
export function exportToCSV<T extends Record<string, unknown>>(
  filename: string,
  data: T[],
  columns?: Array<{ header: string; key: keyof T & string }>
) {
  if (data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Determine columns from data if not provided
  const columnsList =
    columns ||
    (Object.keys(data[0] || {}).map(key => ({
      header: formatHeader(key),
      key,
    })) as Array<{ header: string; key: string }>)

  // Generate CSV content
  const csvContent = generateCSV(data, columnsList)

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

/**
 * Generate CSV content from data array
 */
function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: Array<{ header: string; key: keyof T & string }>
): string {
  const headers = columns.map(col => escapeCSV(col.header))
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key]
      return escapeCSV(formatValue(value))
    })
  )

  const csvRows = [headers, ...rows].map(row => row.join(','))
  return csvRows.join('\n')
}

/**
 * Escape special characters in CSV values.
 *
 * Also prefixes leading `=`, `+`, `-`, `@`, TAB, and CR with a single-quote to
 * neutralise spreadsheet formula injection (OWASP CSV injection). Excel and
 * Google Sheets treat a cell whose first character is one of those as a
 * formula, so an attacker who can set any exported text field (company name,
 * notes, holder name, contact name) could otherwise embed `=HYPERLINK(...)`,
 * `=cmd|'/c calc'!A0`, etc. that fire when an LP opens the CSV.
 */
function escapeCSV(value: string): string {
  if (!value) return '""'

  // Neutralise formula injection on leading dangerous characters.
  let safe = value
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`
  }

  const needsQuotes =
    safe.includes(',') ||
    safe.includes('"') ||
    safe.includes('\n') ||
    safe.includes('\r')

  if (needsQuotes) {
    return `"${safe.replace(/"/g, '""')}"`
  }

  return safe
}

/**
 * Format value for CSV export
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toString()
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Format header text (camelCase to Title Case)
 */
function formatHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ')
    .trim()
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export companies data as CSV
 */
export function exportCompaniesCSV(companies: any[]) {
  const filename = `Companies-${new Date().toISOString().split('T')[0]}.csv`
  const columns = [
    { header: 'Company Name', key: 'name' },
    { header: 'Sector', key: 'sector' },
    { header: 'Stage', key: 'entry_stage' },
    { header: 'Status', key: 'status' },
    { header: 'Strategy', key: 'strategy' },
    { header: 'HQ', key: 'hq' },
    { header: 'Total Invested', key: 'totalInvested' },
    { header: 'Current Value', key: 'currentValue' },
    { header: 'MOIC', key: 'moic' },
    { header: 'Ownership %', key: 'ownershipPct' },
  ]
  exportToCSV(filename, companies, columns)
}

/**
 * Export cap table as CSV
 */
export function exportCapTableCSV(capTable: any[]) {
  const filename = `CapTable-${new Date().toISOString().split('T')[0]}.csv`
  const columns = [
    { header: 'Holder', key: 'holder_name' },
    { header: 'Series', key: 'series' },
    { header: 'Shares', key: 'shares' },
    { header: 'Ownership %', key: 'ownership_pct' },
    { header: 'Type', key: 'holder_type' },
  ]
  exportToCSV(filename, capTable, columns)
}

/**
 * Export tasks as CSV
 */
export function exportTasksCSV(tasks: any[]) {
  const filename = `Tasks-${new Date().toISOString().split('T')[0]}.csv`
  const columns = [
    { header: 'Task', key: 'title' },
    { header: 'Status', key: 'status' },
    { header: 'Priority', key: 'priority' },
    { header: 'Due Date', key: 'due_date' },
    { header: 'Assigned To', key: 'assignee_name' },
    { header: 'Company', key: 'company_name' },
    { header: 'Created', key: 'created_at' },
  ]
  exportToCSV(filename, tasks, columns)
}

/**
 * Export contacts as CSV
 */
export function exportContactsCSV(contacts: any[]) {
  const filename = `Contacts-${new Date().toISOString().split('T')[0]}.csv`
  const columns = [
    { header: 'Name', key: 'name' },
    { header: 'Title', key: 'position' },
    { header: 'Company', key: 'company_name' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'Type', key: 'contact_type' },
    { header: 'Owner', key: 'relationship_owner' },
  ]
  exportToCSV(filename, contacts, columns)
}
