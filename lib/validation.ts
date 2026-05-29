/**
 * Shared input-validation helpers for server actions.
 *
 * Originally lived inline in `actions/founder-updates.ts`. Extracted so every
 * mutating action that writes financial figures (investments, safes, rounds,
 * KPIs, founder updates) can apply the same bounds — once a bad value lands
 * in the DB it cascades into MOIC, ownership, and waterfall math.
 */

/** Maximum length for free-text fields (notes, descriptions). */
export const MAX_FREE_TEXT_LEN = 5_000

/** Trims free-text input to a safe length; returns null when given null. */
export function clampText(s: string | null | undefined): string | null {
  if (s == null) return null
  if (s.length <= MAX_FREE_TEXT_LEN) return s
  return s.slice(0, MAX_FREE_TEXT_LEN)
}

/**
 * Rejects metric values that are non-finite, negative (where it's never
 * meaningful), or absurdly large. Returns true when the value is INVALID,
 * false when null (treated as "not supplied") or within bounds.
 *
 * 1e15 catches accidentally-typed million-billions ($1e15 = $1Q) and most
 * arithmetic-overflow inputs without rejecting legitimate fund-level totals.
 */
export function isInvalidMetric(v: number | null | undefined, allowNegative = false): boolean {
  if (v == null) return false
  if (!Number.isFinite(v)) return true
  if (!allowNegative && v < 0) return true
  if (Math.abs(v) > 1e15) return true
  return false
}
