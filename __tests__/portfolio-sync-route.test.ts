import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock @supabase/supabase-js so the route never talks to a real DB ─────────
const createClientMock = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}))

const SECRET = 's'.repeat(40)

beforeEach(() => {
  createClientMock.mockReset()
  delete process.env.PORTFOLIO_SYNC_SECRET
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
})

function req(method: 'GET' | 'POST', secret: string | null, body?: unknown) {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (secret !== null) headers.set('authorization', `Bearer ${secret}`)
  return new NextRequest('https://example.com/api/sync/portfolio', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function fakeSupabase(companies: Record<string, unknown>[]) {
  const inserts: Record<string, unknown[]> = {}
  const updates: unknown[] = []
  const client = {
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.order = () => Promise.resolve(
        table === 'companies' ? { data: companies, error: null } : { data: [], error: null },
      )
      chain.limit = () => Promise.resolve({ data: [], error: null })
      chain.insert = (row: unknown) => {
        ;(inserts[table] ??= []).push(row)
        return Promise.resolve({ error: null })
      }
      chain.update = (row: unknown) => {
        updates.push(row)
        return { eq: () => Promise.resolve({ error: null }) }
      }
      return chain
    },
  }
  return { client, inserts, updates }
}

function withEnv() {
  process.env.PORTFOLIO_SYNC_SECRET = SECRET
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
}

const COMPANIES = [
  { id: 'c1', name: 'Eye Control', status: 'active', health: null, health_note: null },
  { id: 'c2', name: 'SupPlant', status: 'active', health: 'Watch', health_note: null },
]

describe('/api/sync/portfolio', () => {
  it('returns 503 when PORTFOLIO_SYNC_SECRET is unset', async () => {
    const { GET } = await import('../app/api/sync/portfolio/route')
    const res = await GET(req('GET', 'anything'))
    expect(res.status).toBe(503)
  })

  it('returns 401 when the bearer token does not match', async () => {
    withEnv()
    const { POST } = await import('../app/api/sync/portfolio/route')
    const res = await POST(req('POST', 'wrong', { date: '2026-10-12', items: [] }))
    expect(res.status).toBe(401)
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('rejects a body without a valid date', async () => {
    withEnv()
    createClientMock.mockReturnValue(fakeSupabase(COMPANIES).client)
    const { POST } = await import('../app/api/sync/portfolio/route')
    const res = await POST(req('POST', SECRET, { date: '12/10/2026', items: [] }))
    expect(res.status).toBe(400)
  })

  it('matches names loosely and writes nothing on a dry run', async () => {
    withEnv()
    const fake = fakeSupabase(COMPANIES)
    createClientMock.mockReturnValue(fake.client)
    const { POST } = await import('../app/api/sync/portfolio/route')
    const res = await POST(req('POST', SECRET, {
      date: '2026-10-12',
      dry_run: true,
      items: [
        { company: 'EyeControl', health: 'Critical', update: { title: 'No cash', category: 'Fundraising' } },
        { company: 'Unknown Co', health: 'Watch' },
      ],
    }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.matched).toEqual(['Eye Control'])
    expect(json.unmatched).toEqual(['Unknown Co'])
    expect(json.health_updated).toEqual(['Eye Control'])
    expect(json.updates_inserted).toEqual(['Eye Control'])
    expect(fake.updates).toHaveLength(0)
    expect(fake.inserts).toEqual({})
  })

  it('writes health, an update and notifications on a real run', async () => {
    withEnv()
    const fake = fakeSupabase(COMPANIES)
    createClientMock.mockReturnValue(fake.client)
    const { POST } = await import('../app/api/sync/portfolio/route')
    const res = await POST(req('POST', SECRET, {
      date: '2026-10-12',
      items: [{ company: 'SupPlant', health: 'Critical', health_note: 'Cash to Nov', update: { title: 'Board update', category: 'Bogus' } }],
    }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(fake.updates).toHaveLength(1)
    const inserted = fake.inserts.company_updates?.[0] as { category: string; created_by: string }
    expect(inserted.category).toBe('Other')
    expect(inserted.created_by).toBe('Claude daily refresh')
    expect(json.notifications).toBe(2)
  })
})
