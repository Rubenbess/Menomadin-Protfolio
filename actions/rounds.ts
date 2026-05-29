'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { clampText, isInvalidMetric } from '@/lib/validation'

// Round type became free-text in 62dc4b7 (datalist suggestions). Server actions
// can be invoked directly, bypassing the form's `required` attribute, so guard
// here against whitespace-only and excessively long values that would render
// as a blank/oversized label on the company history tab.
const MAX_ROUND_TYPE_LEN = 80

function normalizeRoundType(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_ROUND_TYPE_LEN)
}

interface RoundInput {
  date: string
  type: string
  pre_money: number
  post_money: number
  amount_raised: number
  notes: string | null
}

interface CreateRoundInput extends RoundInput {
  company_id: string
}

function validateAmounts(data: RoundInput): string | null {
  if (isInvalidMetric(data.pre_money)) return 'Pre-money must be a finite, non-negative number.'
  if (isInvalidMetric(data.post_money)) return 'Post-money must be a finite, non-negative number.'
  if (isInvalidMetric(data.amount_raised)) return 'Amount raised must be a finite, non-negative number.'
  return null
}

export async function createRound(data: CreateRoundInput) {
  const type = normalizeRoundType(data.type)
  if (!type) return { error: 'Round type is required.' }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validationErr = validateAmounts(data)
  if (validationErr) return { error: validationErr }

  const { error } = await supabase.from('rounds').insert({
    ...data,
    type,
    notes: clampText(data.notes),
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateRound(id: string, data: RoundInput) {
  const type = normalizeRoundType(data.type)
  if (!type) return { error: 'Round type is required.' }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validationErr = validateAmounts(data)
  if (validationErr) return { error: validationErr }

  const { error } = await supabase.from('rounds').update({
    ...data,
    type,
    notes: clampText(data.notes),
  }).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteRound(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('rounds').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
