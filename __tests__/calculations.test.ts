import { describe, it, expect } from 'vitest'
import {
  calcMOIC,
  calcTVPI,
  calcDPI,
  calcXIRR,
  calcSafeConversion,
  calcSafeEffectiveValuation,
  calcSafeEstimatedOwnership,
  buildWaterfallHolders,
  calcWaterfall,
  fmt$$,
  fmtPct,
  normalizeSector,
} from '../lib/calculations'
import type { Safe, ShareSeries } from '../lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSafe(overrides: Partial<Safe> = {}): Safe {
  return {
    id: 'safe-1',
    company_id: 'co-1',
    date: '2024-01-01',
    investment_amount: 500_000,
    valuation_cap: 5_000_000,
    discount_rate: null,
    has_mfn: false,
    has_pro_rata: false,
    status: 'unconverted',
    converted_round_id: null,
    converted_shares: null,
    converted_price_per_share: null,
    investor_name: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeSeries(overrides: Partial<ShareSeries> = {}): ShareSeries {
  return {
    id: 's-1',
    company_id: 'co-1',
    round_id: null,
    holder_name: 'Investor A',
    share_class: 'Series A',
    shares: 1_000_000,
    is_preferred: true,
    invested_amount: 1_000_000,
    price_per_share: 1,
    liquidation_pref_mult: 1,
    liquidation_seniority: 1,
    is_participating: false,
    participation_cap_mult: null,
    conversion_ratio: 1,
    anti_dilution: 'none',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── Basic financial metrics ───────────────────────────────────────────────────

describe('calcMOIC', () => {
  it('returns ratio of current value to invested', () => {
    expect(calcMOIC(2_000_000, 1_000_000)).toBe(2)
  })
  it('returns 0 when totalInvested is 0', () => {
    expect(calcMOIC(1_000_000, 0)).toBe(0)
  })
  it('returns 0 when totalInvested is falsy', () => {
    expect(calcMOIC(500_000, 0)).toBe(0)
  })
})

describe('calcTVPI', () => {
  it('divides total portfolio value by total invested', () => {
    expect(calcTVPI(3_000_000, 1_000_000)).toBe(3)
  })
  it('returns 0 on zero invested', () => {
    expect(calcTVPI(1_000_000, 0)).toBe(0)
  })
})

describe('calcDPI', () => {
  it('divides distributions by invested', () => {
    expect(calcDPI(500_000, 1_000_000)).toBeCloseTo(0.5)
  })
  it('returns 0 on zero invested', () => {
    expect(calcDPI(500_000, 0)).toBe(0)
  })
})

// ── IRR ───────────────────────────────────────────────────────────────────────

describe('calcXIRR', () => {
  it('returns null for fewer than 2 cash flows', () => {
    expect(calcXIRR([{ amount: -1000, date: new Date() }])).toBeNull()
  })
  it('returns null when all cash flows are negative', () => {
    expect(calcXIRR([
      { amount: -1000, date: new Date('2023-01-01') },
      { amount: -500,  date: new Date('2024-01-01') },
    ])).toBeNull()
  })
  it('returns null when all cash flows are positive', () => {
    expect(calcXIRR([
      { amount: 1000, date: new Date('2023-01-01') },
      { amount: 500,  date: new Date('2024-01-01') },
    ])).toBeNull()
  })
  it('computes ~100% IRR for a 2× return in exactly 1 year', () => {
    const result = calcXIRR([
      { amount: -1_000_000, date: new Date('2023-01-01') },
      { amount:  2_000_000, date: new Date('2024-01-01') },
    ])
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(1.0, 2) // ~100%
  })
  it('computes ~0% IRR when you get exactly your money back', () => {
    const result = calcXIRR([
      { amount: -1_000_000, date: new Date('2023-01-01') },
      { amount:  1_000_000, date: new Date('2024-01-01') },
    ])
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(0, 3)
  })
})

// ── SAFE calculations ─────────────────────────────────────────────────────────

describe('calcSafeEffectiveValuation', () => {
  it('uses cap when only cap is set', () => {
    const { effectiveVal, mechanism } = calcSafeEffectiveValuation(5_000_000, null, 10_000_000)
    expect(effectiveVal).toBe(5_000_000)
    expect(mechanism).toBe('cap')
  })
  it('uses discount when only discount is set', () => {
    const { effectiveVal, mechanism } = calcSafeEffectiveValuation(null, 20, 10_000_000)
    expect(effectiveVal).toBe(8_000_000)
    expect(mechanism).toBe('discount')
  })
  it('uses whichever is better (lower) when both are set — cap wins', () => {
    const { effectiveVal, mechanism } = calcSafeEffectiveValuation(4_000_000, 20, 10_000_000)
    expect(effectiveVal).toBe(4_000_000)
    expect(mechanism).toBe('cap')
  })
  it('uses whichever is better — discount wins when pre-money exceeds cap', () => {
    // pre-money = 15M; discount → 15M * 0.8 = 12M; cap = 20M → discount wins
    const { effectiveVal, mechanism } = calcSafeEffectiveValuation(20_000_000, 20, 15_000_000)
    expect(effectiveVal).toBe(12_000_000)
    expect(mechanism).toBe('discount')
  })
  it('uses pre-money (MFN) when neither cap nor discount is set', () => {
    const { effectiveVal, mechanism } = calcSafeEffectiveValuation(null, null, 10_000_000)
    expect(effectiveVal).toBe(10_000_000)
    expect(mechanism).toBe('mfn')
  })
})

describe('calcSafeConversion', () => {
  it('ownership % is between 0 and 100', () => {
    const result = calcSafeConversion(500_000, 5_000_000, null, 10_000_000, 2_000_000)
    expect(result.ownershipPct).toBeGreaterThan(0)
    expect(result.ownershipPct).toBeLessThan(100)
  })
  it('sharesValue is proportional to post-round valuation', () => {
    const result = calcSafeConversion(500_000, 5_000_000, null, 10_000_000, 2_000_000)
    const postRoundVal = 10_000_000 + 2_000_000
    expect(result.sharesValue).toBeCloseTo((result.ownershipPct / 100) * postRoundVal, 0)
  })
  it('higher investment amount → larger ownership', () => {
    const small = calcSafeConversion(100_000, 5_000_000, null, 10_000_000, 2_000_000)
    const large = calcSafeConversion(900_000, 5_000_000, null, 10_000_000, 2_000_000)
    expect(large.ownershipPct).toBeGreaterThan(small.ownershipPct)
  })
  it('returns zeroed sentinel — never Infinity — when next pre-money is zero', () => {
    const result = calcSafeConversion(500_000, 5_000_000, null, 0, 2_000_000)
    expect(result.effectiveVal).toBe(0)
    expect(result.ownershipPct).toBe(0)
    expect(result.sharesValue).toBe(0)
    expect(Number.isFinite(result.ownershipPct)).toBe(true)
  })
  it('returns zeroed sentinel when discount rate ≥ 100% (effective val ≤ 0)', () => {
    const result = calcSafeConversion(500_000, null, 100, 10_000_000, 2_000_000)
    expect(result.effectiveVal).toBe(0)
    expect(result.ownershipPct).toBe(0)
  })
  it('returns zeroed sentinel for non-positive investment amount', () => {
    const result = calcSafeConversion(0, 5_000_000, null, 10_000_000, 2_000_000)
    expect(result.ownershipPct).toBe(0)
  })
})

describe('calcSafeEstimatedOwnership', () => {
  it('returns 0 when there is no valuation cap', () => {
    expect(calcSafeEstimatedOwnership(500_000, null)).toBe(0)
  })
  it('returns 0 for zero or negative cap', () => {
    expect(calcSafeEstimatedOwnership(500_000, 0)).toBe(0)
  })
  it('caps at 100%', () => {
    expect(calcSafeEstimatedOwnership(10_000_000, 1_000_000)).toBe(100)
  })
  it('computes correct percentage', () => {
    expect(calcSafeEstimatedOwnership(500_000, 5_000_000)).toBeCloseTo(10, 4)
  })
})

// ── Waterfall builder ─────────────────────────────────────────────────────────

describe('buildWaterfallHolders', () => {
  it('includes converted SAFEs and excludes unconverted SAFEs by status', () => {
    const converted = makeSafe({ status: 'converted' })
    const { holders } = buildWaterfallHolders([], [converted])
    expect(holders).toHaveLength(0) // converted SAFEs are excluded (not unconverted)
  })
  it('adds unconverted SAFE with valid cap to holders', () => {
    const safe = makeSafe()
    const { holders, warnings } = buildWaterfallHolders([], [safe])
    expect(holders).toHaveLength(1)
    expect(holders[0].shareClass).toBe('SAFE')
    expect(warnings).toHaveLength(0)
  })
  it('warns and excludes uncapped SAFE', () => {
    const uncapped = makeSafe({ valuation_cap: null })
    const { holders, warnings } = buildWaterfallHolders([], [uncapped])
    expect(holders).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/excluded/)
  })
  it('warns and excludes SAFE with zero investment amount', () => {
    const zeroInvest = makeSafe({ investment_amount: 0 })
    const { holders, warnings } = buildWaterfallHolders([], [zeroInvest])
    expect(holders).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/investment amount is zero/)
  })
  it('maps share_series to holders correctly', () => {
    const series = makeSeries({ shares: 2_000_000, invested_amount: 2_000_000 })
    const { holders } = buildWaterfallHolders([series], [])
    expect(holders).toHaveLength(1)
    expect(holders[0].shares).toBe(2_000_000)
    expect(holders[0].investedAmount).toBe(2_000_000)
  })
})

// ── Waterfall payout ──────────────────────────────────────────────────────────

describe('calcWaterfall', () => {
  it('pays out 100% of exit value', () => {
    const common = makeSeries({ is_preferred: false, invested_amount: 0, liquidation_pref_mult: 1 })
    const { holders } = buildWaterfallHolders([common], [])
    const result = calcWaterfall(10_000_000, holders)
    const totalPaid = result.holders.reduce((s, h) => s + h.proceeds, 0)
    expect(totalPaid).toBeCloseTo(10_000_000, 0)
  })
  it('preferred gets liquidation preference before common', () => {
    const preferred = makeSeries({
      id: 'pref',
      shares: 1_000_000,
      is_preferred: true,
      invested_amount: 1_000_000,
      liquidation_pref_mult: 1,
      liquidation_seniority: 1,
      is_participating: false,
    })
    const common = makeSeries({
      id: 'common',
      shares: 9_000_000,
      is_preferred: false,
      invested_amount: 0,
      liquidation_pref_mult: 1,
      liquidation_seniority: 0,
    })
    // buildWaterfallHolders converts ShareSeries (snake_case) to WaterfallHolder (camelCase)
    const { holders: waterfallHolders } = buildWaterfallHolders([preferred, common], [])
    // Exit below liquidation pref — preferred should get all
    const result = calcWaterfall(500_000, waterfallHolders)
    const prefResult  = result.holders.find(h => h.id === 'pref')!
    const commResult  = result.holders.find(h => h.id === 'common')!
    expect(prefResult.proceeds).toBeCloseTo(500_000, 0)
    expect(commResult.proceeds).toBeCloseTo(0, 0)
  })
  it('returns empty holders for empty input', () => {
    const result = calcWaterfall(10_000_000, [])
    expect(result.holders).toHaveLength(0)
    expect(result.totalProceeds).toBe(10_000_000)
  })
})

// ── Formatting ────────────────────────────────────────────────────────────────

describe('fmt$$', () => {
  it('formats billions', () => { expect(fmt$$(1_500_000_000)).toBe('$1.5B') })
  it('formats millions', () => { expect(fmt$$(2_500_000)).toBe('$2.5M') })
  it('formats thousands', () => { expect(fmt$$(50_000)).toBe('$50K') })
  it('formats sub-thousand', () => { expect(fmt$$(999)).toBe('$999') })
})

describe('fmtPct', () => {
  it('formats to 2 decimal places with % sign', () => {
    expect(fmtPct(12.345)).toBe('12.35%')
  })
})

describe('normalizeSector', () => {
  it('maps lowercase alias to canonical form', () => {
    expect(normalizeSector('saas')).toBe('SaaS')
    expect(normalizeSector('healthtech')).toBe('Healthtech')
    expect(normalizeSector('cleantech')).toBe('Cleantech')
  })
  it('title-cases unknown sectors', () => {
    expect(normalizeSector('agritech')).toBe('Agritech')
  })
  it('returns Other for empty string', () => {
    expect(normalizeSector('')).toBe('Other')
  })
})
