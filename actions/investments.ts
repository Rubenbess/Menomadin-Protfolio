'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function createInvestment(data: {
  company_id: string
  round_id: string | null
  date: string
  amount: number
  instrument: string
  valuation_cap: number | null
  legal_entity: string | null
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('investments').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateInvestment(id: string, data: {
  date: string
  amount: number
  instrument: string
  valuation_cap: number | null
  legal_entity: string | null
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('investments').update(data).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteInvestment(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('investments').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
