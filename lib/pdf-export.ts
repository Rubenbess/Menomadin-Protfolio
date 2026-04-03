import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ExportOptions {
  title?: string
  subtitle?: string
  includeTimestamp?: boolean
  pageSize?: 'a4' | 'letter'
}

/**
 * Export data as PDF with professional formatting
 */
export function exportToPDF(
  filename: string,
  data: any[],
  columns: Array<{ header: string; key: string; width?: number }>,
  options: ExportOptions = {}
) {
  const {
    title,
    subtitle,
    includeTimestamp = true,
    pageSize = 'a4',
  } = options

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: pageSize,
  })

  let yPosition = 15

  // Add title
  if (title) {
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text(title, 14, yPosition)
    yPosition += 7
  }

  // Add subtitle
  if (subtitle) {
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(subtitle, 14, yPosition)
    yPosition += 6
  }

  // Add timestamp
  if (includeTimestamp) {
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    const now = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    doc.text(`Generated: ${now}`, 14, yPosition)
    yPosition += 4
  }

  // Add table
  const tableColumn = columns.map(col => col.header)
  const tableRows = data.map(row =>
    columns.map(col => {
      const value = row[col.key]
      if (value === null || value === undefined) return '—'
      if (typeof value === 'boolean') return value ? 'Yes' : 'No'
      if (typeof value === 'number') return value.toLocaleString()
      return String(value)
    })
  )

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: yPosition,
    headStyles: {
      fillColor: [184, 149, 106],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      textColor: [50, 50, 50],
      fontSize: 9,
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [80, 80, 80],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { top: yPosition + 5 },
    didDrawPage: (data) => {
      // Footer
      const pageSize = doc.internal.pageSize
      const pageHeight = pageSize.getHeight()
      const pageWidth = pageSize.getWidth()
      const pageCount = doc.internal.pages.length - 1

      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Page ${(data as any).pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    },
  })

  doc.save(filename)
}

/**
 * Export portfolio summary as PDF
 */
export interface PortfolioExportData {
  totalInvested: number
  currentValue: number
  tvpi: number
  moic: number
  irr: number
  dpi: number
  companies: Array<{
    name: string
    sector: string
    status: string
    invested: number
    value: number
    moic: number
  }>
}

export function exportPortfolioToPDF(data: PortfolioExportData) {
  const doc = new jsPDF()

  // Metrics section
  doc.setFontSize(20)
  doc.setFont(undefined, 'bold')
  doc.text('Portfolio Summary', 14, 15)

  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  const metrics = [
    ['Total Invested', `$${(data.totalInvested / 1_000_000).toFixed(2)}M`],
    ['Current Value', `$${(data.currentValue / 1_000_000).toFixed(2)}M`],
    ['TVPI', `${data.tvpi.toFixed(2)}x`],
    ['MOIC', `${data.moic.toFixed(2)}x`],
    ['IRR', `${(data.irr * 100).toFixed(1)}%`],
    ['DPI', `${data.dpi.toFixed(2)}x`],
  ]

  let yPos = 30
  metrics.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold')
    doc.text(label, 14, yPos)
    doc.setFont(undefined, 'normal')
    doc.text(value, 100, yPos, { align: 'right' })
    yPos += 8
  })

  // Companies table
  yPos += 5
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text('Companies', 14, yPos)

  autoTable(doc, {
    head: [['Company', 'Sector', 'Status', 'Invested', 'Value', 'MOIC']],
    body: data.companies.map(c => [
      c.name,
      c.sector,
      c.status,
      `$${(c.invested / 1_000_000).toFixed(2)}M`,
      `$${(c.value / 1_000_000).toFixed(2)}M`,
      `${c.moic.toFixed(2)}x`,
    ]),
    startY: yPos + 5,
    headStyles: {
      fillColor: [184, 149, 106],
      textColor: 255,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  })

  const filename = `Portfolio-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
