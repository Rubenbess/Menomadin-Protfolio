import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock Resend before route imports ─────────────────────────────────────────
type ResendSendResult = { error: null | { message: string } }
const resendSendMock = vi.fn<() => Promise<ResendSendResult>>(async () => ({ error: null }))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resendSendMock }
  },
}))

// ── Mock @supabase/supabase-js so cron routes don't talk to a real DB ────────
const createClientMock = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}))

beforeEach(() => {
  resendSendMock.mockClear()
  createClientMock.mockReset()
  delete process.env.CRON_SECRET
  delete process.env.RESEND_API_KEY
  delete process.env.LP_EMAILS
  delete process.env.TEAM_EMAIL
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
})

function reqWithAuth(secret: string | null) {
  const headers = new Headers()
  if (secret !== null) headers.set('authorization', `Bearer ${secret}`)
  return new NextRequest('https://example.com/api/cron/lp-report', { headers })
}

// ── lp-report ────────────────────────────────────────────────────────────────

describe('GET /api/cron/lp-report', () => {
  it('returns 503 when CRON_SECRET is unset', async () => {
    const { GET } = await import('../app/api/cron/lp-report/route')
    const res = await GET(reqWithAuth('any'))
    expect(res.status).toBe(503)
  })

  it('returns 401 when bearer token does not match CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'real-secret'
    const { GET } = await import('../app/api/cron/lp-report/route')
    const res = await GET(reqWithAuth('wrong'))
    expect(res.status).toBe(401)
  })

  it('returns 503 when Resend / LP_EMAILS env vars are missing', async () => {
    process.env.CRON_SECRET = 'real-secret'
    const { GET } = await import('../app/api/cron/lp-report/route')
    const res = await GET(reqWithAuth('real-secret'))
    expect(res.status).toBe(503)
  })

  it('returns 503 when Supabase env vars are missing', async () => {
    process.env.CRON_SECRET = 'real-secret'
    process.env.RESEND_API_KEY = 're_xxx'
    process.env.LP_EMAILS = 'lp@example.com'
    const { GET } = await import('../app/api/cron/lp-report/route')
    const res = await GET(reqWithAuth('real-secret'))
    expect(res.status).toBe(503)
  })

  it('uses the service role key (bypassing RLS) when constructing the Supabase client', async () => {
    process.env.CRON_SECRET = 'real-secret'
    process.env.RESEND_API_KEY = 're_xxx'
    process.env.LP_EMAILS = 'lp@example.com'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'

    createClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    })

    const { GET } = await import('../app/api/cron/lp-report/route')
    const res = await GET(reqWithAuth('real-secret'))

    expect(createClientMock).toHaveBeenCalledWith('https://x.supabase.co', 'service-key')
    expect(res.status).toBe(200)
    expect(resendSendMock).toHaveBeenCalledOnce()
  })

  it('returns 502 (not 500) when Resend fails — Resend is an external dependency', async () => {
    process.env.CRON_SECRET = 'real-secret'
    process.env.RESEND_API_KEY = 're_xxx'
    process.env.LP_EMAILS = 'lp@example.com'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'

    createClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    })
    resendSendMock.mockResolvedValueOnce({ error: { message: 'Resend down' } })

    const { GET } = await import('../app/api/cron/lp-report/route')
    const res = await GET(reqWithAuth('real-secret'))
    expect(res.status).toBe(502)
  })
})

// ── reminders ────────────────────────────────────────────────────────────────

describe('GET /api/cron/reminders', () => {
  it('returns 503 when CRON_SECRET is unset', async () => {
    const { GET } = await import('../app/api/cron/reminders/route')
    const res = await GET(reqWithAuth('any'))
    expect(res.status).toBe(503)
  })

  it('returns 401 when bearer token does not match', async () => {
    process.env.CRON_SECRET = 'real-secret'
    const { GET } = await import('../app/api/cron/reminders/route')
    const res = await GET(reqWithAuth('wrong'))
    expect(res.status).toBe(401)
  })

  it('returns 503 when env vars are missing', async () => {
    process.env.CRON_SECRET = 'real-secret'
    const { GET } = await import('../app/api/cron/reminders/route')
    const res = await GET(reqWithAuth('real-secret'))
    expect(res.status).toBe(503)
  })

  it('uses the service role client and short-circuits with sent:0 when no reminders are due', async () => {
    process.env.CRON_SECRET = 'real-secret'
    process.env.RESEND_API_KEY = 're_xxx'
    process.env.TEAM_EMAIL = 'team@example.com'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'

    createClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            lte: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    })

    const { GET } = await import('../app/api/cron/reminders/route')
    const res = await GET(reqWithAuth('real-secret'))

    expect(createClientMock).toHaveBeenCalledWith('https://x.supabase.co', 'service-key')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(0)
    // No reminders → no email send
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it('sends the digest and returns 502 when Resend fails', async () => {
    process.env.CRON_SECRET = 'real-secret'
    process.env.RESEND_API_KEY = 're_xxx'
    process.env.TEAM_EMAIL = 'team@example.com'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'

    createClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            lte: () => ({
              order: () => Promise.resolve({
                data: [{
                  title: 'Follow up with Acme',
                  due_date: '2026-04-01',
                  category: 'Outreach',
                  notes: null,
                  companies: { name: 'Acme' },
                }],
                error: null,
              }),
            }),
          }),
        }),
      }),
    })
    resendSendMock.mockResolvedValueOnce({ error: { message: 'Resend timeout' } })

    const { GET } = await import('../app/api/cron/reminders/route')
    const res = await GET(reqWithAuth('real-secret'))
    expect(res.status).toBe(502)
  })
})
