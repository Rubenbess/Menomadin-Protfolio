import type { Investment, Round, CapTableEntry } from './types'

export function calcMOIC(currentValue: number, totalInvested: number): number {
  if (!totalInvested || totalInvested === 0) return 0
  return currentValue / totalInvested
}

export function calcCurrentValue(ownershipPct: number, latestPostMoney: number): number {
  return (ownershipPct / 100) * latestPostMoney
}

export function calcTVPI(totalPortfolioValue: number, totalInvested: number): number {
  if (!totalInvested || totalInvested === 0) return 0
  return totalPortfolioValue / totalInvested
}

export function getLatestRound(rounds: Round[]): Round | null {
  if (!rounds.length) return null
  return [...rounds].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
}

/** Returns the fund's ownership % from the latest cap table entry. */
export function getFundOwnershipPct(capTable: CapTableEntry[]): number {
  if (!capTable.length) return 0
  // Use the last entry (most recent) — users should add the fund entry last
  return capTable[capTable.length - 1].ownership_percentage
}

export function totalInvestedInCompany(investments: Investment[]): number {
  return investments.reduce((sum, inv) => sum + inv.amount, 0)
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function fmt$$(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

export function fmtMultiple(x: number): string {
  return `${x.toFixed(2)}x`
}

export function fmtPct(p: number): string {
  return `${p.toFixed(2)}%`
}

export function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
