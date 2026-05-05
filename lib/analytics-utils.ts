/**
 * Analytics utilities for portfolio metrics and calculations
 */

export interface InvestmentByStage {
  stage: string
  amount: number
  count: number
}

export interface SectorMetrics {
  sector: string
  invested: number
  currentValue: number
  count: number
}

export interface TimeSeriesData {
  date: string
  invested: number
  value: number
}

export interface CompanyPerformance {
  name: string
  invested: number
  value: number
  moic: number
  status: string
}

/**
 * Shape produced by Server Components after pre-computing metrics on the
 * raw `companies` rows (see app/(protected)/analytics/page.tsx and
 * dashboard/page.tsx). Optional fields tolerate callers that haven't
 * computed every metric — `c.moic ?? …` style is used everywhere.
 */
export interface CompanyWithMetrics {
  name?: string
  sector?: string | null
  status?: string
  entry_stage?: string | null
  totalInvested?: number
  currentValue?: number
  moic?: number
}

/**
 * Group investments by stage
 */
export function getInvestmentsByStage(companies: CompanyWithMetrics[]): InvestmentByStage[] {
  const stages = new Map<string, { amount: number; count: number }>()

  companies.forEach(c => {
    const stage = c.entry_stage || 'Unknown'
    const current = stages.get(stage) || { amount: 0, count: 0 }
    stages.set(stage, {
      amount: current.amount + (c.totalInvested || 0),
      count: current.count + 1,
    })
  })

  return Array.from(stages.entries()).map(([stage, data]) => ({
    stage,
    ...data,
  }))
}

/**
 * Group investments by sector
 */
export function getInvestmentsBySector(companies: CompanyWithMetrics[]): SectorMetrics[] {
  const sectors = new Map<string, { invested: number; currentValue: number; count: number }>()

  companies.forEach(c => {
    const sector = c.sector || 'Unknown'
    const current = sectors.get(sector) || { invested: 0, currentValue: 0, count: 0 }
    sectors.set(sector, {
      invested: current.invested + (c.totalInvested || 0),
      currentValue: current.currentValue + (c.currentValue || 0),
      count: current.count + 1,
    })
  })

  return Array.from(sectors.entries())
    .map(([sector, data]) => ({
      sector,
      ...data,
    }))
    .sort((a, b) => b.invested - a.invested)
}

/**
 * Get performance rankings
 */
export function getTopPerformers(companies: CompanyWithMetrics[], limit = 5): CompanyPerformance[] {
  return companies
    .map(c => ({
      name: c.name ?? 'Unknown',
      invested: c.totalInvested || 0,
      value: c.currentValue || 0,
      moic: c.moic || 1,
      status: c.status || 'unknown',
    }))
    .sort((a, b) => b.moic - a.moic)
    .slice(0, limit)
}

/**
 * Get underperformers
 */
export function getUnderperformers(companies: CompanyWithMetrics[], limit = 5): CompanyPerformance[] {
  return companies
    .map(c => ({
      name: c.name ?? 'Unknown',
      invested: c.totalInvested || 0,
      value: c.currentValue || 0,
      moic: c.moic || 1,
      status: c.status || 'unknown',
    }))
    .filter(c => c.moic < 1)
    .sort((a, b) => a.moic - b.moic)
    .slice(0, limit)
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${value.toFixed(0)}`
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format multiple (MOIC, TVPI, DPI)
 */
export function formatMultiple(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}x`
}
