/**
 * Canonical number/date formatters. All UI code formatting money, percents,
 * multiples, or dates should import from here so the precision is consistent
 * across pages.
 *
 * `fmt$$` is the short form (1.2M / 50K) used in dense tables; `formatCurrency`
 * is an alias kept for callers that prefer the long-form name.
 */

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

// ─── Aliases (long-form names used by analytics page) ──────────────────────

export const formatCurrency = fmt$$
export const formatMultiple = fmtMultiple

/**
 * Formats a fraction (e.g. 0.235) as a percent ("23.5%"). Distinct from
 * fmtPct, which formats an already-multiplied percent value (e.g. 23.5).
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}
