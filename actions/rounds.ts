'use server'

import { revalidatePath } from 'next/cache'
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
  revalidatePath(`/companies/${data.company_id}`)
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
  const { data: row, error } = await supabase
    .from('rounds').update(data).eq('id', id).select('company_id').single()
  if (error) return { error: error.message }
  if (row?.company_id) revalidatePath(`/companies/${row.company_id}`)
  return { error: null }
}

export async function deleteRound(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase.from('rounds').select('company_id').eq('id', id).single()
  const { error } = await supabase.from('rounds').delete().eq('id', id)
  if (error) return { error: error.message }
  if (row?.company_id) revalidatePath(`/companies/${row.company_id}`)
  return { error: null }
}
