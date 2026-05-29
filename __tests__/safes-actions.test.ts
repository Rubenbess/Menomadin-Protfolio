import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache so revalidatePath is a no-op
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Each test reconfigures the mocked Supabase client.
const supabaseMock = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
}

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: () => Promise.resolve(supabaseMock),
}))

// Import after mocks so the action picks them up.
const { convertSafe } = await import('../actions/safes')

interface SafeRow {
  id: string
  company_id: string
  status: 'unconverted' | 'converted'
  investment_amount: number
  valuation_cap: number | null
  discount_rate: number | null
  investor_name?: string | null
}

function buildSupabase(opts: {
  safeRow: SafeRow | null
  fetchErr?: { message: string } | null
  rpcErr?: { message: string } | null
  authed?: boolean
}) {
  const rpcCalls: Array<{ name: string; payload: Record<string, unknown> }> = []

  supabaseMock.auth.getUser.mockResolvedValue(
    opts.authed === false
      ? { data: { user: null } }
      : { data: { user: { id: 'user-1' } } }
  )

  supabaseMock.from.mockImplementation((table: string) => {
    if (table === 'safes') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: opts.safeRow,
              error: opts.fetchErr ?? null,
            }),
          }),
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  supabaseMock.rpc.mockImplementation((name: string, payload: Record<string, unknown>) => {
    rpcCalls.push({ name, payload })
    return Promise.resolve({ error: opts.rpcErr ?? null })
  })

  return { rpcCalls }
}

beforeEach(() => {
  supabaseMock.from.mockReset()
  supabaseMock.rpc.mockReset()
  supabaseMock.auth.getUser.mockReset()
})

describe('convertSafe', () => {
  it('happy path: invokes convert_safe RPC with the calculated ownership %', async () => {
    const { rpcCalls } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        status: 'unconverted',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
      },
    })

    const result = await convertSafe('safe-1', 'round-1', 10_000_000, 2_000_000)

    expect(result.error).toBeNull()
    expect(result.ownershipPct).toBeGreaterThan(0)
    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].name).toBe('convert_safe')
    expect(rpcCalls[0].payload).toMatchObject({
      p_safe_id: 'safe-1',
      p_round_id: 'round-1',
      // Holder name uses the bare fund name (no "(SAFE)" suffix) so legal-
      // entities alias matching rolls the converted shares into the same holder.
      p_holder_name: 'Menomadin',
    })
  })

  it('uses the external investor name when investor_name is set, without a "(SAFE)" suffix', async () => {
    const { rpcCalls } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        status: 'unconverted',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
        investor_name: 'Sequoia',
      },
    })

    await convertSafe('safe-1', 'round-1', 10_000_000, 2_000_000)

    expect(rpcCalls[0].payload.p_holder_name).toBe('Sequoia')
  })

  it('zero-ownership early-return: never invokes the RPC', async () => {
    // Pre-money of 0 forces calcSafeConversion to return the zeroed sentinel
    const { rpcCalls } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        status: 'unconverted',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
      },
    })

    const result = await convertSafe('safe-1', 'round-1', 0, 1_000_000)

    expect(result.error).toBeTruthy()
    expect(result.error).toMatch(/valid ownership/)
    expect(rpcCalls).toHaveLength(0)
  })

  it('idempotency: refuses to re-convert an already-converted SAFE', async () => {
    const { rpcCalls } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        status: 'converted',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
      },
    })

    const result = await convertSafe('safe-1', 'round-1', 10_000_000, 2_000_000)

    expect(result.error).toMatch(/already been converted/i)
    expect(rpcCalls).toHaveLength(0)
  })

  it('propagates the RPC error when the DB-side conversion fails', async () => {
    const { rpcCalls } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        status: 'unconverted',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
      },
      rpcErr: { message: 'SAFE safe-1 is already converted or does not exist' },
    })

    const result = await convertSafe('safe-1', 'round-1', 10_000_000, 2_000_000)

    expect(result.error).toMatch(/already converted or does not exist/)
    expect(rpcCalls).toHaveLength(1)
  })

  it('returns an error and does not call the RPC when the SAFE does not exist', async () => {
    const { rpcCalls } = buildSupabase({
      safeRow: null,
      fetchErr: { message: 'no row' },
    })

    const result = await convertSafe('missing-safe', 'round-1', 10_000_000, 2_000_000)

    expect(result.error).toBeTruthy()
    expect(rpcCalls).toHaveLength(0)
  })

  it('rejects unauthenticated callers without touching the DB', async () => {
    const { rpcCalls } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        status: 'unconverted',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
      },
      authed: false,
    })

    const result = await convertSafe('safe-1', 'round-1', 10_000_000, 2_000_000)

    expect(result.error).toBe('Not authenticated')
    expect(rpcCalls).toHaveLength(0)
  })

  it('rejects degenerate numeric inputs (NaN / negative)', async () => {
    const { rpcCalls } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        status: 'unconverted',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
      },
    })

    const negResult = await convertSafe('safe-1', 'round-1', -10_000_000, 2_000_000)
    expect(negResult.error).toMatch(/finite, non-negative/)
    expect(rpcCalls).toHaveLength(0)

    const nanResult = await convertSafe('safe-1', 'round-1', Number.NaN, 2_000_000)
    expect(nanResult.error).toMatch(/finite, non-negative/)
    expect(rpcCalls).toHaveLength(0)
  })
})
