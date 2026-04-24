'use client'

import { Download } from 'lucide-react'

interface CompanyRow {
  name: string
  strategy: string
  status: string
  sector: string
  totalInvested: number
  currentValue: number
  moic: number
  ownershipPct: number
}

interface Props {
  companies: CompanyRow[]
}

export default function ExportPortfolioCSV({ companies }: Props) {
  function handleExport() {
    const header = [
      'Company',
      'Strategy',
      'Status',
      'Sector',
      'Total Invested ($)',
      'Current Value ($)',
      'MOIC (x)',
      'Ownership (%)',
    ]

    const rows = companies.map(c => [
      c.name,
      c.strategy,
      c.status,
      c.sector || '',
      c.totalInvested.toFixed(0),
      c.currentValue.toFixed(0),
      c.moic.toFixed(2),
      (c.ownershipPct * 100).toFixed(2),
    ])

    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors flex-shrink-0"
    >
      <Download size={14} />
      Export CSV
    </button>
  )
}
