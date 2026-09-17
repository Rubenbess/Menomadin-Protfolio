import { describe, it, expect } from 'vitest'
import { localDateKey, todayLocal, addDaysLocal, jerusalemDateKey, todayJerusalem } from '@/lib/date-utils'

// These guard the UTC-vs-local bug class that has now produced three separate
// defects (task completion trend, sidebar overdue badge, reminder status).
// `toISOString()` would fail every case below for any timezone ahead of UTC.

describe('localDateKey', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // Local midnight — `toISOString()` would roll this back a day at UTC+n.
    const d = new Date(2026, 6, 29, 0, 0, 0)
    expect(localDateKey(d)).toBe('2026-07-29')
  })

  it('is stable across the whole local day', () => {
    const start = new Date(2026, 6, 29, 0, 0, 0)
    const end = new Date(2026, 6, 29, 23, 59, 59)
    expect(localDateKey(start)).toBe(localDateKey(end))
  })

  it('zero-pads month and day', () => {
    expect(localDateKey(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05')
  })
})

describe('addDaysLocal', () => {
  it('advances one day', () => {
    expect(addDaysLocal(1, new Date(2026, 6, 29, 12, 0, 0))).toBe('2026-07-30')
  })

  it('crosses a month boundary', () => {
    expect(addDaysLocal(1, new Date(2026, 6, 31, 12, 0, 0))).toBe('2026-08-01')
  })

  it('crosses a year boundary backwards', () => {
    expect(addDaysLocal(-1, new Date(2026, 0, 1, 12, 0, 0))).toBe('2025-12-31')
  })

  it('handles a leap day', () => {
    expect(addDaysLocal(1, new Date(2028, 1, 28, 12, 0, 0))).toBe('2028-02-29')
  })
})

describe('jerusalemDateKey', () => {
  // These assert against absolute UTC instants, so they hold no matter what
  // timezone the test runner (or Vercel's UTC server) happens to be in.

  it('is still the previous day at 21:00 UTC in winter (UTC+2)', () => {
    // 2026-01-15T21:00Z = 2026-01-15 23:00 in Israel.
    expect(jerusalemDateKey(new Date('2026-01-15T21:00:00Z'))).toBe('2026-01-15')
  })

  it('has already rolled over at 22:30 UTC in winter', () => {
    // 2026-01-15T22:30Z = 2026-01-16 00:30 in Israel. This is the case the raw
    // `toISOString()` idiom gets wrong: it would say 2026-01-15.
    expect(jerusalemDateKey(new Date('2026-01-15T22:30:00Z'))).toBe('2026-01-16')
  })

  it('rolls over an hour earlier under summer DST (UTC+3)', () => {
    // 2026-07-15T21:30Z = 2026-07-16 00:30 in Israel.
    expect(jerusalemDateKey(new Date('2026-07-15T21:30:00Z'))).toBe('2026-07-16')
    expect(jerusalemDateKey(new Date('2026-07-15T20:30:00Z'))).toBe('2026-07-15')
  })

  it('zero-pads and returns YYYY-MM-DD', () => {
    expect(jerusalemDateKey(new Date('2026-03-05T10:00:00Z'))).toBe('2026-03-05')
  })
})

describe('todayJerusalem', () => {
  it('agrees with jerusalemDateKey(new Date())', () => {
    expect(todayJerusalem()).toBe(jerusalemDateKey(new Date()))
  })
})

describe('todayLocal', () => {
  it('agrees with localDateKey(new Date())', () => {
    expect(todayLocal()).toBe(localDateKey(new Date()))
  })

  it('returns a YYYY-MM-DD string', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
