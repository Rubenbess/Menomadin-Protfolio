'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

interface ReserveData {
  reserved_amount: number
  deployed_amount: number
  target_round: string | null
  notes: string | null
}

export async function upsertReserve(companyId: string, data: ReserveData) {
  const supabase = await createServerSupabaseClient()

  const { data: existing } = await supabase
    .from('reserves')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('reserves').update(data).eq('company_id', companyId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('reserves').insert({ company_id: companyId, ...data })
    if (error) return { error: error.message }
  }

  return { error: null }
}

export async function deleteReserve(companyId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('reserves').delete().eq('company_id', companyId)
  if (error) return { error: error.message }
  return { error: null }
}
