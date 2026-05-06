import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache so revalidatePath is a no-op
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Each test reconfigures the mocked Supabase client.
const supabaseMock = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: () => Promise.resolve(supabaseMock),
}))

// Import after mocks so the action picks them up.
const { convertSafe } = await import('../actions/safes')

interface SafeRow {
  id: string
  company_id: string
  investment_amount: number
  valuation_cap: number | null
  discount_rate: number | null
}

function buildSupabase(opts: {
  safeRow: SafeRow | null
  fetchErr?: { message: string } | null
  updateErr?: { message: string } | null
  capInsertErr?: { message: string } | null
  revertErr?: { message: string } | null
}) {
  const safeUpdates: Array<Record<string, unknown>> = []
  const capInserts: Array<Record<string, unknown>> = []

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
        update: (payload: Record<string, unknown>) => {
          safeUpdates.push(payload)
          // First update is the convert; second is the revert (if any).
          const isRevert = payload.status === 'unconverted'
          return {
            eq: () => Promise.resolve({
              error: isRevert ? (opts.revertErr ?? null) : (opts.updateErr ?? null),
            }),
          }
        },
      }
    }
    if (table === 'cap_table') {
      return {
        insert: (payload: Record<string, unknown>) => {
          capInserts.push(payload)
          return Promise.resolve({ error: opts.capInsertErr ?? null })
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return { safeUpdates, capInserts }
}

beforeEach(() => {
  supabaseMock.from.mockReset()
})

describe('convertSafe', () => {
  it('happy path: marks SAFE converted and inserts cap-table entry', async () => {
    const { safeUpdates, capInserts } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
      },
    })

    const result = await convertSafe('safe-1', 'round-1', 10_000_000, 2_000_000)

    expect(result.error).toBeNull()
    expect(result.ownershipPct).toBeGreaterThan(0)
    expect(safeUpdates).toHaveLength(1)
    expect(safeUpdates[0]).toMatchObject({ status: 'converted', converted_round_id: 'round-1' })
    expect(capInserts).toHaveLength(1)
    expect(capInserts[0]).toMatchObject({ company_id: 'co-1', round_id: 'round-1' })
    // Holder name must use the bare fund name (no "(SAFE)" suffix) so legal-
    // entities alias matching rolls the converted shares into the same holder.
    expect(capInserts[0].shareholder_name).toBe('Menomadin')
  })

  it('uses the external investor name when investor_name is set, without a "(SAFE)" suffix', async () => {
    const { capInserts } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
        investor_name: 'Sequoia',
      } as SafeRow & { investor_name: string },
    })

    await convertSafe('safe-1', 'round-1', 10_000_000, 2_000_000)

    expect(capInserts[0].shareholder_name).toBe('Sequoia')
  })

  it('zero-ownership early-return leaves the SAFE untouched', async () => {
    // Pre-money of 0 forces calcSafeConversion to return the zeroed sentinel
    const { safeUpdates, capInserts } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
      },
    })

    const result = await convertSafe('safe-1', 'round-1', 0, 1_000_000)

    expect(result.error).toBeTruthy()
    expect(result.error).toMatch(/valid ownership/)
    // Crucial: no writes should have happened
    expect(safeUpdates).toHaveLength(0)
    expect(capInserts).toHaveLength(0)
  })

  it('rolls back the SAFE update if the cap-table insert fails', async () => {
    const { safeUpdates, capInserts } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
      },
      capInsertErr: { message: 'rls violation' },
    })

    const result = await convertSafe('safe-1', 'round-1', 10_000_000, 2_000_000)

    expect(result.error).toMatch(/rolled back/i)
    expect(capInserts).toHaveLength(1)
    // The convert update + the rollback update — exactly two writes
    expect(safeUpdates).toHaveLength(2)
    expect(safeUpdates[0]).toMatchObject({ status: 'converted' })
    expect(safeUpdates[1]).toMatchObject({ status: 'unconverted', converted_round_id: null })
  })

  it('reports a combined error when both the cap-table insert and the rollback fail', async () => {
    const { safeUpdates } = buildSupabase({
      safeRow: {
        id: 'safe-1',
        company_id: 'co-1',
        investment_amount: 500_000,
        valuation_cap: 5_000_000,
        discount_rate: null,
      },
      capInsertErr: { message: 'rls violation' },
      revertErr: { message: 'transient db error' },
    })

    const result = await convertSafe('safe-1', 'round-1', 10_000_000, 2_000_000)

    expect(result.error).toMatch(/rls violation/)
    expect(result.error).toMatch(/transient db error/)
    expect(result.error).toMatch(/safe-1/)
    expect(result.error).toMatch(/manual/i)
    // Two attempts: convert + (failed) revert
    expect(safeUpdates).toHaveLength(2)
  })

  it('returns an error and does not write when the SAFE does not exist', async () => {
    const { safeUpdates, capInserts } = buildSupabase({
      safeRow: null,
      fetchErr: { message: 'no row' },
    })

    const result = await convertSafe('missing-safe', 'round-1', 10_000_000, 2_000_000)

    expect(result.error).toBeTruthy()
    expect(safeUpdates).toHaveLength(0)
    expect(capInserts).toHaveLength(0)
  })
})
