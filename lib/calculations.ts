import { differenceInDays } from 'date-fns'
import type { Investment, Round, CapTableEntry, ShareSeries, OptionPool, Safe, WaterfallHolder, WaterfallHolderResult, WaterfallResult, DataCompleteness, CompanyKPI, CompanyUpdate, HealthScore, LegalEntity } from './types'

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

/**
 * Returns combined ownership % across all configured legal entities.
 * Sums cap table entries whose shareholder_name matches each entity's
 * cap_table_alias (or name if no alias set). Falls back to getFundOwnershipPct
 * when no entities are configured or no entries match.
 */
export function calcCombinedOwnershipPct(
  capTable: CapTableEntry[],
  legalEntities: LegalEntity[],
): number {
  if (!legalEntities.length) return getFundOwnershipPct(capTable)
  const total = legalEntities.reduce((sum, entity) => {
    const alias = entity.cap_table_alias || entity.name
    return sum + capTable
      .filter(c => c.shareholder_name.toLowerCase() === alias.toLowerCase())
      .reduce((s, c) => s + c.ownership_percentage, 0)
  }, 0)
  return total || getFundOwnershipPct(capTable)
}

export function totalInvestedInCompany(investments: Investment[]): number {
  return investments.reduce((sum, inv) => sum + inv.amount, 0)
}

// ─── IRR (XIRR via Newton's method) ─────────────────────────────────────────

export interface CashFlow {
  amount: number  // negative = capital out, positive = proceeds in
  date: Date
}

/**
 * Newton-Raphson XIRR. Years use a 365.25-day basis — accurate to roughly
 * ±0.1% over multi-year horizons; not appropriate for sub-day precision.
 */
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
      mechanism: effectiveVal === capVal ? 'cap' : 'discount',
    }
  }
  if (valuationCap != null) return { effectiveVal: capVal, mechanism: 'cap' }
  if (discountRate != null) return { effectiveVal: discountVal, mechanism: 'discount' }
  return { effectiveVal: nextPreMoney, mechanism: 'mfn' }
}

/**
 * Full post-conversion ownership calculation given a hypothetical next round.
 *
 * Returns a zeroed sentinel `{ effectiveVal: 0, ownershipPct: 0, sharesValue: 0 }`
 * when any denominator would be non-positive (next pre-money ≤ 0, derived
 * effective valuation ≤ 0, e.g. a discount rate ≥ 100%, or a non-positive
 * investment amount). Callers must treat `effectiveVal === 0` as "input
 * incomplete/invalid" rather than rendering or persisting the result, since
 * an Infinity ownership written to the cap table would corrupt the dataset.
 */
export function calcSafeConversion(
  investmentAmount: number,
  valuationCap: number | null,
  discountRate: number | null,
  nextPreMoney: number,
  roundRaise: number,
): SafeConversionResult {
  const { effectiveVal, mechanism } = calcSafeEffectiveValuation(valuationCap, discountRate, nextPreMoney)

  if (
    !Number.isFinite(effectiveVal) || effectiveVal <= 0 ||
    !Number.isFinite(nextPreMoney) || nextPreMoney <= 0 ||
    !Number.isFinite(investmentAmount) || investmentAmount <= 0 ||
    !Number.isFinite(roundRaise) || roundRaise < 0
  ) {
    return { effectiveVal: 0, mechanism, ownershipPct: 0, sharesValue: 0 }
  }

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

/**
 * Pre-dilution estimated ownership for an unconverted SAFE, using the cap as proxy.
 * Does NOT account for the new round's dilution, existing cap-table dilution, or
 * other SAFEs converting at the same time — so the result is an upper bound, not a
 * forecast. Capped at 100% to prevent obviously misleading display values; if a
 * caller wants the raw uncapped figure they should compute it inline.
 */
export function calcSafeEstimatedOwnership(
  investmentAmount: number,
  valuationCap: number | null,
): number {
  if (!valuationCap || valuationCap <= 0) return 0
  const raw = (investmentAmount / valuationCap) * 100
  return Math.min(raw, 100)
}

// ─── Institutional Cap Table Calculations ────────────────────────────────────

/** Derive price-per-share from pre-money valuation and shares outstanding. */
export function derivePricePerShare(preMoney: number, sharesOutstanding: number): number {
  if (!sharesOutstanding || sharesOutstanding === 0) return 0
  return preMoney / sharesOutstanding
}

/** Total fully-diluted shares = issued shares + option pool reserved + SAFE shares (estimated). */
export function calcFullyDilutedShares(
  issuedShares: number,
  optionPools: OptionPool[],
): number {
  const poolShares = optionPools.reduce((s, p) => s + p.shares_authorized, 0)
  return issuedShares + poolShares
}

/** Issued ownership % for a holder. */
export function calcIssuedOwnershipPct(holderShares: number, totalIssuedShares: number): number {
  if (!totalIssuedShares) return 0
  return (holderShares / totalIssuedShares) * 100
}

/** Fully-diluted ownership % for a holder (denominator includes option pool). */
export function calcFullyDilutedOwnershipPct(holderShares: number, totalFDShares: number): number {
  if (!totalFDShares) return 0
  return (holderShares / totalFDShares) * 100
}

/**
 * Broad-based weighted average anti-dilution adjustment.
 * Returns the adjusted conversion price (new PPS that the preferred holder converts at).
 */
export function calcAntiDilutionBroadBasedWA(
  originalPPS: number,
  totalSharesPreRound: number,   // fully diluted shares before new issuance
  newSharesIssued: number,
  newPPS: number,
): number {
  if (!originalPPS || originalPPS === 0) return 0
  // Formula: CP_new = CP_old × (A + B) / (A + C)
  //   A = total shares outstanding (pre-round, FD)
  //   B = shares issuable for the money at old CP
  //   C = new shares actually issued
  const a = totalSharesPreRound
  const b = (newSharesIssued * newPPS) / originalPPS
  const c = newSharesIssued
  if (a + c === 0) return originalPPS
  return originalPPS * ((a + b) / (a + c))
}

/**
 * Assess data completeness of a company's cap table.
 * minimal       = only percentage data
 * partial       = has some share_series but missing PPS or invested amounts
 * high_confidence = full share_series with PPS + liq prefs
 * fully_modeled = all of the above + option pools
 */
export function assessDataCompleteness(
  shareSeries: ShareSeries[],
  optionPools: OptionPool[],
): DataCompleteness {
  if (shareSeries.length === 0) return 'minimal'
  const hasPPS = shareSeries.every(s => s.price_per_share != null)
  const hasAmounts = shareSeries.every(s => s.invested_amount != null)
  if (!hasPPS || !hasAmounts) return 'partial'
  if (optionPools.length === 0) return 'high_confidence'
  return 'fully_modeled'
}

/**
 * Build WaterfallHolder array from share_series + option_pools + SAFEs.
 * Options are modeled as unissued common for FD purposes.
 * Unconverted SAFEs are added as the lowest-seniority preferred.
 *
 * Returns warnings for SAFEs that could not be modeled (no valuation cap),
 * so the caller can surface them rather than silently producing a
 * waterfall result that misallocates proceeds.
 */
export function buildWaterfallHolders(
  shareSeries: ShareSeries[],
  safes: Safe[],
): { holders: WaterfallHolder[]; warnings: string[] } {
  const warnings: string[] = []
  const holders: WaterfallHolder[] = shareSeries.map(s => ({
    id: s.id,
    name: s.holder_name,
    shareClass: s.share_class,
    isPreferred: s.is_preferred,
    shares: s.shares,
    investedAmount: s.invested_amount ?? 0,
    liquidationPrefMult: s.liquidation_pref_mult,
    seniority: s.liquidation_seniority,
    isParticipating: s.is_participating,
    participationCapMult: s.participation_cap_mult,
    conversionRatio: s.conversion_ratio,
  }))

  // Add unconverted SAFEs as lowest-seniority preferred (using invested_amount as proxy)
  for (const safe of safes) {
    if (safe.status !== 'unconverted') continue
    // Skip SAFEs without a valuation cap — we cannot estimate share count, so they
    // would receive a 1× preference but no participation in the residual, silently
    // misallocating proceeds. Surface a warning instead.
    if (!safe.valuation_cap || safe.valuation_cap <= 0) {
      warnings.push(
        `Uncapped SAFE from ${safe.date.slice(0, 7)} ($${safe.investment_amount.toLocaleString()}) excluded from waterfall — add a valuation cap to include it.`
      )
      continue
    }
    // Skip SAFEs with no investment amount — they would produce 0 shares and
    // 0 proceeds, polluting the holders list without contributing to the waterfall.
    if (!safe.investment_amount || safe.investment_amount <= 0) {
      warnings.push(
        `SAFE from ${safe.date.slice(0, 7)} excluded from waterfall — investment amount is zero.`
      )
      continue
    }
    const estimatedShares = Math.round((safe.investment_amount / safe.valuation_cap) * 1_000_000)
    holders.push({
      id: `safe-${safe.id}`,
      name: `SAFE (${safe.date.slice(0, 7)})`,
      shareClass: 'SAFE',
      isPreferred: true,
      shares: estimatedShares,
      investedAmount: safe.investment_amount,
      liquidationPrefMult: 1.0,
      seniority: -1,  // lowest seniority
      isParticipating: false,
      participationCapMult: null,
      conversionRatio: 1.0,
    })
  }

  return { holders, warnings }
}

/**
 * Liquidation waterfall calculation.
 *
 * Algorithm:
 * 1. Determine which non-participating preferred would convert
 *    (as-if-converted value > their liq preference)
 * 2. Pay liq preferences in seniority order (highest first) to non-converters
 * 3. Distribute remaining to: common + participating preferred + converting preferred
 *    (pro-rata by common-equivalent shares, capped for participating preferred)
 */
export function calcWaterfall(
  exitValue: number,
  holders: WaterfallHolder[],
): WaterfallResult {
  const totalCommonEquiv = holders.reduce((s, h) => s + h.shares * h.conversionRatio, 0)

  // Step 1: Determine converters among non-participating preferred
  const convertingIds = new Set<string>()
  for (const h of holders) {
    if (!h.isPreferred || h.isParticipating) continue
    if (totalCommonEquiv === 0) continue
    const commonEquiv = h.shares * h.conversionRatio
    const asCommonValue = (commonEquiv / totalCommonEquiv) * exitValue
    const liqPref = h.investedAmount * h.liquidationPrefMult
    if (asCommonValue > liqPref) convertingIds.add(h.id)
  }

  // Step 2: Pay liq preferences to non-converters
  let remaining = exitValue
  const payouts = new Map<string, number>()

  const nonConverters = holders.filter(h => h.isPreferred && !convertingIds.has(h.id))
  const seniorityLevels = [...new Set(nonConverters.map(h => h.seniority))].sort((a, b) => b - a)

  for (const level of seniorityLevels) {
    if (remaining <= 0) break
    const levelHolders = nonConverters.filter(h => h.seniority === level)
    const totalPref = levelHolders.reduce((s, h) => s + h.investedAmount * h.liquidationPrefMult, 0)

    // If everyone in this tier has $0 invested, there's no preference to pay —
    // skip the tier so leftover proceeds continue down to common/participating
    // distribution rather than being silently zeroed.
    if (totalPref === 0) continue

    if (remaining >= totalPref) {
      for (const h of levelHolders) {
        const pref = h.investedAmount * h.liquidationPrefMult
        payouts.set(h.id, (payouts.get(h.id) ?? 0) + pref)
        remaining -= pref
      }
    } else {
      // Waterfall runs dry — pro-rata within this seniority tier
      for (const h of levelHolders) {
        const pref = h.investedAmount * h.liquidationPrefMult
        const share = (pref / totalPref) * remaining
        payouts.set(h.id, (payouts.get(h.id) ?? 0) + share)
      }
      remaining = 0
    }
  }

  // Step 3: Distribute remaining to common + participating preferred + converters
  if (remaining > 0) {
    const participatingHolders = holders.filter(
      h => !h.isPreferred || h.isParticipating || convertingIds.has(h.id)
    )
    const totalParticipatingEquiv = participatingHolders.reduce(
      (s, h) => s + h.shares * h.conversionRatio, 0
    )

    if (totalParticipatingEquiv > 0) {
      const dist = new Map<string, number>()
      for (const h of participatingHolders) {
        const equiv = h.shares * h.conversionRatio
        dist.set(h.id, (equiv / totalParticipatingEquiv) * remaining)
      }

      // Apply participation caps
      let capExcess = 0
      const cappedIds = new Set<string>()
      for (const h of holders) {
        if (!h.isParticipating || h.participationCapMult === null) continue
        const alreadyPaid = payouts.get(h.id) ?? 0
        const maxPayout = h.investedAmount * h.participationCapMult
        const d = dist.get(h.id) ?? 0
        if (alreadyPaid + d > maxPayout) {
          const cappedDist = Math.max(0, maxPayout - alreadyPaid)
          capExcess += d - cappedDist
          dist.set(h.id, cappedDist)
          cappedIds.add(h.id)
        }
      }

      // Redistribute cap excess to uncapped common
      if (capExcess > 0) {
        const uncappedCommon = participatingHolders.filter(
          h => !h.isPreferred && !cappedIds.has(h.id)
        )
        const uncappedEquiv = uncappedCommon.reduce((s, h) => s + h.shares * h.conversionRatio, 0)
        if (uncappedEquiv > 0) {
          for (const h of uncappedCommon) {
            const extra = ((h.shares * h.conversionRatio) / uncappedEquiv) * capExcess
            dist.set(h.id, (dist.get(h.id) ?? 0) + extra)
          }
        }
      }

      for (const [id, d] of dist) {
        payouts.set(id, (payouts.get(id) ?? 0) + d)
      }
    }
  }

  // Build result
  const totalIssuedShares = holders.reduce((s, h) => s + h.shares, 0)

  const holderResults: WaterfallHolderResult[] = holders.map(h => {
    const proceeds = payouts.get(h.id) ?? 0
    return {
      ...h,
      proceeds,
      ownershipPct: totalIssuedShares > 0 ? (h.shares / totalIssuedShares) * 100 : 0,
      // null for holders with no money in (founders' common, options) — UI renders as "—"
      multiple: h.investedAmount > 0 ? proceeds / h.investedAmount : null,
      isConverting: convertingIds.has(h.id),
    }
  })

  return { totalProceeds: exitValue, holders: holderResults, warnings: [] }
}

// ─── Health Score ─────────────────────────────────────────────────────────────

/**
 * Compute a 0-100 health score for a portfolio company.
 *  KPI trend    0-30  (ARR/revenue/run_rate QoQ growth)
 *  Runway       0-30  (cash_runway months from latest KPI)
 *  Update recency 0-20 (days since last company update)
 *  MOIC         0-20  (current value vs invested)
 */
export function calcHealthScore(
  kpis: CompanyKPI[],
  updates: CompanyUpdate[],
  investments: Investment[],
  rounds: Round[],
  capTable: CapTableEntry[],
  today: Date = new Date(),
): HealthScore {
  // MOIC score (0-20)
  const invested = totalInvestedInCompany(investments)
  const latestRound = getLatestRound(rounds)
  const ownershipPct = getFundOwnershipPct(capTable)
  const currentValue = latestRound ? calcCurrentValue(ownershipPct, latestRound.post_money) : 0
  const moic = calcMOIC(currentValue, invested)
  let moicScore = 10 // neutral — no data
  if (invested > 0 && latestRound) {
    if (moic >= 2) moicScore = 20
    else if (moic >= 1.5) moicScore = 15
    else if (moic >= 1) moicScore = 10
    else moicScore = 5
  }

  // KPI trend score (0-30)
  const sortedKpis = [...kpis].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  let kpiScore = 10 // neutral
  let kpiTrend: HealthScore['kpiTrend'] = null
  if (sortedKpis.length >= 2) {
    const latestKpi = sortedKpis[0]
    const prevKpi   = sortedKpis[1]
    const latestVal = latestKpi.arr ?? latestKpi.revenue ?? latestKpi.run_rate
    const prevVal   = prevKpi.arr   ?? prevKpi.revenue   ?? prevKpi.run_rate
    if (latestVal != null && prevVal != null && prevVal > 0) {
      const growth = (latestVal - prevVal) / prevVal
      if (growth > 0.05)       { kpiScore = 30; kpiTrend = 'up' }
      else if (growth < -0.05) { kpiScore = 5;  kpiTrend = 'down' }
      else                     { kpiScore = 15; kpiTrend = 'flat' }
    }
  }

  // Runway score (0-30)
  let runwayScore = 10 // neutral
  let runwayMonths: number | null = null
  if (sortedKpis.length > 0 && sortedKpis[0].cash_runway != null) {
    runwayMonths = sortedKpis[0].cash_runway
    if (runwayMonths > 18) runwayScore = 30
    else if (runwayMonths >= 6) runwayScore = 15
    else runwayScore = 5
  }

  // Update recency score (0-20)
  let updateScore = 0
  let lastUpdateDays: number | null = null
  if (updates.length > 0) {
    const latest = [...updates].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0]
    // differenceInDays normalizes both sides to local midnight, so the result
    // is stable across DST and timezone offsets — no off-by-one at day boundaries.
    lastUpdateDays = Math.max(0, differenceInDays(today, new Date(latest.date)))
    if (lastUpdateDays <= 30) updateScore = 20
    else if (lastUpdateDays <= 90) updateScore = 10
    else updateScore = 0
  }

  return {
    total: kpiScore + runwayScore + updateScore + moicScore,
    kpiScore,
    runwayScore,
    updateScore,
    moicScore,
    runwayMonths,
    lastUpdateDays,
    kpiTrend,
    moic,
  }
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
