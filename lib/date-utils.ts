/**
 * Local-calendar date helpers.
 *
 * `Date.prototype.toISOString()` converts to UTC before serialising, so the
 * common `new Date().toISOString().split('T')[0]` idiom does NOT yield "today"
 * for anyone ahead of UTC. Israel is UTC+2/+3, so:
 *
 *   - between local midnight and 02:00/03:00, that idiom returns *yesterday*;
 *   - a Date pinned to local midnight (`setHours(0,0,0,0)`) returns yesterday
 *     at *every* hour of the day.
 *
 * On this platform that has meant overdue reminders classified as "due today",
 * task badges undercounting, and date inputs prefilled with the wrong day.
 * Use these helpers for anything that means a calendar day in the user's
 * timezone. Keep `toISOString()` only where a UTC instant is genuinely wanted.
 */

/** Format a Date as local-calendar `YYYY-MM-DD`. */
export function localDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Today's local calendar date as `YYYY-MM-DD`. */
export function todayLocal(): string {
  return localDateKey(new Date())
}

/**
 * Format a Date as the `YYYY-MM-DD` calendar day in Israel, regardless of the
 * runtime's own timezone.
 *
 * `localDateKey` reads the *process* timezone. In the browser that is the
 * user's, which is what we want — but on Vercel the server process runs in UTC,
 * so on the server `localDateKey` is exactly the broken `toISOString()` idiom
 * wearing a different name. Server code (cron routes, server actions writing
 * `due_date` / `next_occurrence`) must use these Jerusalem-anchored helpers
 * instead, or it will write and compare the wrong calendar day for the two to
 * three hours after Israeli midnight.
 */
const JERUSALEM_KEY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function jerusalemDateKey(d: Date): string {
  return JERUSALEM_KEY.format(d)
}

/** Today's calendar date in Israel as `YYYY-MM-DD`. Safe on the server. */
export function todayJerusalem(): string {
  return jerusalemDateKey(new Date())
}

/** Local calendar date `n` days from today as `YYYY-MM-DD` (n may be negative). */
export function addDaysLocal(n: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + n)
  return localDateKey(d)
}
