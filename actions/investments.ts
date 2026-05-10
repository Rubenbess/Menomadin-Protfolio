'use server'

import { revalidatePath } from 'next/cache'
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
  revalidatePath(`/companies/${data.company_id}`)
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
  const { data: row, error } = await supabase
    .from('investments').update(data).eq('id', id).select('company_id').single()
  if (error) return { error: error.message }
  if (row?.company_id) revalidatePath(`/companies/${row.company_id}`)
  return { error: null }
}

export async function deleteInvestment(id: string) {
  const supabase = await createServerSupabaseClient()
  // Capture the company_id before deletion so the page can be revalidated.
  const { data: row } = await supabase.from('investments').select('company_id').eq('id', id).single()
  const { error } = await supabase.from('investments').delete().eq('id', id)
  if (error) return { error: error.message }
  if (row?.company_id) revalidatePath(`/companies/${row.company_id}`)
  return { error: null }
}
