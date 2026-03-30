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

// ─── SAFE Calculations (Pre-money SAFE) ─────────────────────────────────────
//
// In a pre-money SAFE the conversion price is derived from the pre-money cap
// (not the post-money), so the SAFE holder's dilution from the new round is
// accounted for separately.
//
// Ownership formula (all in $, no share counts needed):
//   safe_units      = investment / effective_val
//   new_inv_units   = round_raise / pre_money
//   total_units     = 1 + safe_units + new_inv_units
//   safe_pct        = safe_units / total_units  (as a %)

export interface SafeConversionResult {
  effectiveVal: number          // valuation used for conversion
  mechanism: 'cap' | 'discount' | 'mfn' | 'cap+discount'
  ownershipPct: number          // % post-conversion, post-round
  sharesValue: number           // value of stake at that pre-money
}

/** Effective conversion valuation for a pre-money SAFE. */
export function calcSafeEffectiveValuation(
  valuationCap: number | null,
  discountRate: number | null,  // e.g. 20 for 20%
  nextPreMoney: number,
): { effectiveVal: number; mechanism: SafeConversionResult['mechanism'] } {
  const capVal      = valuationCap ?? Infinity
  const discountVal = discountRate != null ? nextPreMoney * (1 - discountRate / 100) : Infinity

  if (valuationCap != null && discountRate != null) {
    const effectiveVal = Math.min(capVal, discountVal)
    return {
      effectiveVal,
      mechanism: effectiveVal === capVal ? 'cap+discount' : 'cap+discount',
    }
  }
  if (valuationCap != null) return { effectiveVal: capVal, mechanism: 'cap' }
  if (discountRate != null) return { effectiveVal: discountVal, mechanism: 'discount' }
  return { effectiveVal: nextPreMoney, mechanism: 'mfn' }
}

/** Full post-conversion ownership calculation given a hypothetical next round. */
export function calcSafeConversion(
  investmentAmount: number,
  valuationCap: number | null,
  discountRate: number | null,
  nextPreMoney: number,
  roundRaise: number,
): SafeConversionResult {
  const { effectiveVal, mechanism } = calcSafeEffectiveValuation(valuationCap, discountRate, nextPreMoney)

  const safeUnits   = investmentAmount / effectiveVal
  const newInvUnits = roundRaise / nextPreMoney
  const totalUnits  = 1 + safeUnits + newInvUnits
  const ownershipPct = (safeUnits / totalUnits) * 100

  return {
    effectiveVal,
    mechanism,
    ownershipPct,
    sharesValue: (ownershipPct / 100) * (nextPreMoney + roundRaise),
  }
}

/** Estimated ownership before conversion, using the cap as proxy (ignores round dilution). */
export function calcSafeEstimatedOwnership(
  investmentAmount: number,
  valuationCap: number | null,
): number {
  if (!valuationCap) return 0
  return (investmentAmount / valuationCap) * 100
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
