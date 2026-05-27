'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { calcSafeConversion } from '@/lib/calculations'
import { FUND_NAME } from '@/lib/branding'

interface SafeData {
  company_id: string
  date: string
  investment_amount: number
  valuation_cap: number | null
  discount_rate: number | null
  has_mfn: boolean
  has_pro_rata: boolean
  investor_name: string | null
  notes: string | null
}

export async function createSafe(data: SafeData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('safes').insert({ ...data, status: 'unconverted' })
  if (error) return { error: error.message }
  revalidatePath(`/companies/${data.company_id}`)
  return { error: null }
}

export async function updateSafe(id: string, data: Partial<SafeData>) {
  const supabase = await createServerSupabaseClient()
  const { data: safe, error: fetchErr } = await supabase
    .from('safes').select('company_id').eq('id', id).single()
  if (fetchErr || !safe) return { error: fetchErr?.message ?? 'SAFE not found' }

  const { error } = await supabase.from('safes').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${safe.company_id}`)
  return { error: null }
}

export async function deleteSafe(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: safe, error: fetchErr } = await supabase
    .from('safes').select('company_id').eq('id', id).single()
  if (fetchErr || !safe) return { error: fetchErr?.message ?? 'SAFE not found' }

  const { error } = await supabase.from('safes').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${safe.company_id}`)
  return { error: null }
}

/**
 * Converts a SAFE at a given round:
 * 1. Marks SAFE as converted
 * 2. Auto-creates a cap table entry with the calculated ownership %
 */
export async function convertSafe(
  safeId: string,
  roundId: string,
  nextPreMoney: number,
  roundRaise: number,
  conversionDetails?: { shares?: number; pricePerShare?: number },
) {
  const supabase = await createServerSupabaseClient()

  const { data: safe, error: fetchErr } = await supabase
    .from('safes').select('*').eq('id', safeId).single()
  if (fetchErr || !safe) return { error: fetchErr?.message ?? 'SAFE not found' }

  const result = calcSafeConversion(
    safe.investment_amount,
    safe.valuation_cap,
    safe.discount_rate,
    nextPreMoney,
    roundRaise,
  )

  // calcSafeConversion returns the zeroed sentinel when its inputs would
  // produce Infinity (non-positive pre-money / discount ≥ 100% / no investment).
  // Refuse to write a degenerate cap-table entry — once persisted, NaN/0 ownership
  // would corrupt downstream waterfall math.
  if (!Number.isFinite(result.ownershipPct) || result.ownershipPct <= 0 || result.effectiveVal <= 0) {
    return { error: 'Cannot convert: the round inputs do not produce a valid ownership percentage. Check that pre-money is positive and the SAFE has a usable valuation cap or discount.' }
  }

  // Use the bare holder name (no "(SAFE)" suffix) so legal_entities alias
  // matching and ownership-summation in the company detail page roll the
  // converted shares into the same holder's other cap-table rows.
  const holderName = safe.investor_name ?? FUND_NAME

  // Atomic conversion via Postgres RPC: marks the SAFE as converted AND inserts
  // the cap-table entry in a single transaction, eliminating the race window that
  // existed when these were two sequential API calls with a best-effort rollback.
  const { error: rpcErr } = await supabase.rpc('convert_safe', {
    p_safe_id:         safeId,
    p_round_id:        roundId,
    p_holder_name:     holderName,
    p_ownership_pct:   result.ownershipPct,
    p_shares:          conversionDetails?.shares ?? null,
    p_price_per_share: conversionDetails?.pricePerShare ?? null,
  })
  if (rpcErr) return { error: rpcErr.message }

  revalidatePath(`/companies/${safe.company_id}`)
  return { error: null, ownershipPct: result.ownershipPct }
}
