'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { calcSafeConversion } from '@/lib/calculations'

interface SafeData {
  company_id: string
  date: string
  investment_amount: number
  valuation_cap: number | null
  discount_rate: number | null
  has_mfn: boolean
  has_pro_rata: boolean
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
  if (fetchErr) return { error: fetchErr.message }

  const { error } = await supabase.from('safes').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${safe.company_id}`)
  return { error: null }
}

export async function deleteSafe(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: safe, error: fetchErr } = await supabase
    .from('safes').select('company_id').eq('id', id).single()
  if (fetchErr) return { error: fetchErr.message }

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

  // Mark SAFE as converted
  const { error: updateErr } = await supabase
    .from('safes')
    .update({ status: 'converted', converted_round_id: roundId })
    .eq('id', safeId)
  if (updateErr) return { error: updateErr.message }

  // Auto-create cap table entry
  const { error: capErr } = await supabase.from('cap_table').insert({
    company_id: safe.company_id,
    round_id: roundId,
    shareholder_name: 'Menomadin (SAFE)',
    ownership_percentage: result.ownershipPct,
  })
  if (capErr) return { error: capErr.message }

  revalidatePath(`/companies/${safe.company_id}`)
  return { error: null, ownershipPct: result.ownershipPct }
}
