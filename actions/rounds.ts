'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function createRound(data: {
  company_id: string
  date: string
  type: string
  pre_money: number
  post_money: number
  amount_raised: number
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('rounds').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateRound(id: string, data: {
  date: string
  type: string
  pre_money: number
  post_money: number
  amount_raised: number
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('rounds').update(data).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteRound(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('rounds').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
