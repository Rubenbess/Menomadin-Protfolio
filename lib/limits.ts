/**
 * Pagination / display limits used across pages. Centralised so future tweaks
 * happen in one place rather than being scattered as magic numbers.
 */

/** Notifications shown in the bell dropdown / hydrated into AppShell. */
export const NOTIFICATIONS_PAGE_SIZE = 30

/** Top-N portfolio companies surfaced in dashboard sparklines. */
export const TOP_COMPANIES_FOR_SPARKLINE = 8

/** Months of history rendered on the dashboard performance chart. */
export const PERFORMANCE_CHART_MONTHS = 12

/** Soft cap on full-table fetches to keep server-render times bounded. */
export const FULL_LIST_FETCH_LIMIT = 500
