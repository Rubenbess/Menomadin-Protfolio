'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

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

export async function createRound(data: {
  company_id: string
  date: string
  type: string
  pre_money: number
  post_money: number
  amount_raised: number
  notes: string | null
}) {
  const type = normalizeRoundType(data.type)
  if (!type) return { error: 'Round type is required.' }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('rounds').insert({
    ...data,
    type,
    notes: data.notes ? data.notes.slice(0, 5000) : null,
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateRound(id: string, data: {
  date: string
  type: string
  pre_money: number
  post_money: number
  amount_raised: number
  notes: string | null
}) {
  const type = normalizeRoundType(data.type)
  if (!type) return { error: 'Round type is required.' }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('rounds').update({
    ...data,
    type,
    notes: data.notes ? data.notes.slice(0, 5000) : null,
  }).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteRound(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('rounds').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
