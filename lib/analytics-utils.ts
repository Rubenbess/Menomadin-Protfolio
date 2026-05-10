/**
 * Analytics utilities for portfolio metrics and calculations
 */
import type { CompanyWithMetrics } from './types'

// Re-export so callers can keep importing the type from this module.
export type { CompanyWithMetrics }

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
      moic: c.moic ?? 0,
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
      moic: c.moic ?? 0,
      status: c.status || 'unknown',
    }))
    .filter(c => c.moic < 1)
    .sort((a, b) => a.moic - b.moic)
    .slice(0, limit)
}

// Formatters live in lib/format.ts. Re-exported so existing imports keep working.
export { formatCurrency, formatPercent, formatMultiple } from './format'
