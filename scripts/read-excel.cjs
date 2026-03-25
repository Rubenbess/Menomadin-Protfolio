const XLSX = require('xlsx')

const FILE = 'C:/Users/rubenb/OneDrive - Menomadin Group/Investment Team/Investment_Dashboard.xlsx'

const workbook = XLSX.readFile(FILE)

console.log('=== SHEETS ===')
console.log(workbook.SheetNames)

for (const sheetName of workbook.SheetNames) {
  console.log(`\n=== SHEET: ${sheetName} ===`)
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  console.log(`Rows: ${rows.length}`)
  if (rows.length > 0) {
    console.log('Columns:', Object.keys(rows[0]))
    console.log('First 3 rows:')
    console.log(JSON.stringify(rows.slice(0, 3), null, 2))
  }
}
