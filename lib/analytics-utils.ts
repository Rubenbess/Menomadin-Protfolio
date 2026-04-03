/**
 * Analytics utilities for portfolio metrics and calculations
 */

export interface PortfolioMetrics {
  totalInvested: number
  currentValue: number
  gainLoss: number
  gainLossPercent: number
  tvpi: number
  moic: number
  irr: number
  dpi: number
  numCompanies: number
  numActiveDeals: number
  numExits: number
}

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
 * Calculate portfolio metrics from companies data
 */
export function calculatePortfolioMetrics(companies: any[]): PortfolioMetrics {
  const totalInvested = companies.reduce((sum, c) => sum + (c.totalInvested || 0), 0)
  const currentValue = companies.reduce((sum, c) => sum + (c.currentValue || 0), 0)
  const gainLoss = currentValue - totalInvested
  const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0

  // Calculate weighted averages
  const weights = companies.map(c => c.totalInvested || 0)
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  const tvpi = totalInvested > 0 ? currentValue / totalInvested : 0
  const moic = totalWeight > 0
    ? companies.reduce((sum, c, i) => sum + ((c.moic || 1) * weights[i]), 0) / totalWeight
    : 0
  const irr = totalWeight > 0
    ? companies.reduce((sum, c, i) => sum + ((c.irr || 0) * weights[i]), 0) / totalWeight
    : 0
  const dpi = totalWeight > 0
    ? companies.reduce((sum, c, i) => sum + ((c.dpi || 0) * weights[i]), 0) / totalWeight
    : 0

  const numActiveDeals = companies.filter(c => c.status === 'active').length
  const numExits = companies.filter(c => c.status === 'exited').length

  return {
    totalInvested,
    currentValue,
    gainLoss,
    gainLossPercent,
    tvpi,
    moic,
    irr,
    dpi,
    numCompanies: companies.length,
    numActiveDeals,
    numExits,
  }
}

/**
 * Group investments by stage
 */
export function getInvestmentsByStage(companies: any[]): InvestmentByStage[] {
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
export function getInvestmentsBySector(companies: any[]): SectorMetrics[] {
  const sectors = new Map<string, { invested: number; value: number; count: number }>()

  companies.forEach(c => {
    const sector = c.sector || 'Unknown'
    const current = sectors.get(sector) || { invested: 0, value: 0, count: 0 }
    sectors.set(sector, {
      invested: current.invested + (c.totalInvested || 0),
      value: current.value + (c.currentValue || 0),
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
export function getTopPerformers(companies: any[], limit = 5): CompanyPerformance[] {
  return companies
    .map(c => ({
      name: c.name,
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
export function getUnderperformers(companies: any[], limit = 5): CompanyPerformance[] {
  return companies
    .map(c => ({
      name: c.name,
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
