/**
 * Brand identifiers used in defaults, fallbacks, and email/PDF chrome.
 *
 * Static product copy (login page, README, marketing) is free to spell the
 * name out directly — the goal of this module is to centralize the strings
 * that programmatically depend on the fund identity, so a future rename or
 * white-label deployment is one PR rather than a grep across 40 files.
 */

export const FUND_NAME = 'Menomadin'
export const FUND_FULL_NAME = 'Menomadin Group'
export const FUND_PORTFOLIO_NAME = 'Menomadin Portfolio'

/**
 * Known aliases for the fund as it appears in `cap_table.shareholder_name`.
 * Historically the column was free-text, so the same holding has been written
 * as any of these. Used to filter "fund-owned" cap-table rows for LP reports
 * and dashboard ownership summaries — never trust a name-substring shortcut
 * that would also catch e.g. "Menomadin Health Inc." (a portfolio company).
 *
 * Matched case-insensitively, exact match only — see `isFundShareholder`.
 */
export const FUND_SHAREHOLDER_ALIASES: readonly string[] = [
  'Menomadin',
  'Menomadin Group',
  'Menomadin Foundation',
  'Menomadin Impact Fund',
  'MIF',
] as const

/** True when the cap-table row's shareholder_name refers to our fund. */
export function isFundShareholder(name: string | null | undefined): boolean {
  if (!name) return false
  const normalized = name.trim().toLowerCase()
  return FUND_SHAREHOLDER_ALIASES.some(a => a.toLowerCase() === normalized)
}

/**
 * Default `from` address for outbound system mail (LP reports, cron alerts,
 * weekly deal reports). Real env should override this via `RESEND_FROM_EMAIL`.
 * Centralizing here avoids the address being scattered across cron routes.
 */
export const BRAND_NO_REPLY_EMAIL = 'noreply@menomadin.com'
