/**
 * Fund / strategy display config. Edit here when adding a fund or rebranding —
 * not in individual page components.
 */
import type { Strategy } from './types'

export interface FundConfig {
  /** Strategy enum value used in `companies.strategy` */
  id: Strategy
  /** Long display name shown in tables, charts, and reports */
  label: string
  /** Tailwind colour token for the strategy chip */
  color: string
}

export const FUNDS: ReadonlyArray<FundConfig> = [
  { id: 'impact',  label: 'Menomadin Impact',  color: 'emerald' },
  { id: 'venture', label: 'Menomadin Catalyst', color: 'blue' },
] as const

const FUND_BY_ID: Record<Strategy, FundConfig> = Object.fromEntries(
  FUNDS.map(f => [f.id, f]),
) as Record<Strategy, FundConfig>

export function fundLabel(strategy: Strategy | null | undefined): string {
  if (!strategy) return '—'
  return FUND_BY_ID[strategy]?.label ?? strategy
}

export function fundColor(strategy: Strategy | null | undefined): string {
  if (!strategy) return 'neutral'
  return FUND_BY_ID[strategy]?.color ?? 'neutral'
}
