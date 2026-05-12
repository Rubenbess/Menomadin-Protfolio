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
 * Default `from` address for outbound system mail (LP reports, cron alerts,
 * weekly deal reports). Real env should override this via `RESEND_FROM_EMAIL`.
 * Centralizing here avoids the address being scattered across cron routes.
 */
export const BRAND_NO_REPLY_EMAIL = 'noreply@menomadin.com'
