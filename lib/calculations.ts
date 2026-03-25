import type { Investment, Round, CapTableEntry } from './types'

// Canonical sector names — any alias maps to the canonical form
const SECTOR_ALIASES: Record<string, string> = {
  healthtech: 'Healthtech',
  'health tech': 'Healthtech',
  'health-tech': 'Healthtech',
  saas: 'SaaS',
  fintech: 'Fintech',
  cleantech: 'Cleantech',
  'clean tech': 'Cleantech',
  'clean-tech': 'Cleantech',
  consumer: 'Consumer',
  'deep tech': 'Deep Tech',
  deeptech: 'Deep Tech',
  'deep-tech': 'Deep Tech',
  marketplace: 'Marketplace',
  other: 'Other',
}

export function normalizeSector(sector: string): string {
  if (!sector) return 'Other'
  const key = sector.trim().toLowerCase()
  return SECTOR_ALIASES[key] ?? sector.trim().replace(/\b\w/g, c => c.toUpperCase())
}

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

// ─── IRR (XIRR via Newton's method) ─────────────────────────────────────────

export interface CashFlow {
  amount: number  // negative = capital out, positive = proceeds in
  date: Date
}

export function calcXIRR(cashFlows: CashFlow[]): number | null {
  if (cashFlows.length < 2) return null
  if (!cashFlows.some(cf => cf.amount < 0)) return null
  if (!cashFlows.some(cf => cf.amount > 0)) return null

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime())
  const t0 = sorted[0].date.getTime()

  function years(d: Date) {
    return (d.getTime() - t0) / (365.25 * 86_400_000)
  }

  function npv(r: number) {
    return sorted.reduce((s, cf) => s + cf.amount / Math.pow(1 + r, years(cf.date)), 0)
  }

  function dnpv(r: number) {
    return sorted.reduce((s, cf) => {
      const t = years(cf.date)
      return s - t * cf.amount / Math.pow(1 + r, t + 1)
    }, 0)
  }

  let r = 0.15
  for (let i = 0; i < 200; i++) {
    const f  = npv(r)
    const df = dnpv(r)
    if (Math.abs(df) < 1e-12) break
    const next = r - f / df
    if (Math.abs(next - r) < 1e-8) return next > -1 ? next : null
    r = next
    if (r <= -1 || r > 100) return null
  }
  return null
}

// ─── DPI ─────────────────────────────────────────────────────────────────────

export function calcDPI(totalDistributions: number, totalInvested: number): number {
  if (!totalInvested || totalInvested === 0) return 0
  return totalDistributions / totalInvested
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
