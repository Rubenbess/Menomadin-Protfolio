'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function createKPI(data: {
  company_id: string
  date: string
  revenue: number | null
  arr: number | null
  run_rate: number | null
  burn_rate: number | null
  cash_runway: number | null
  headcount: number | null
  gross_margin: number | null
  notes: string | null
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('company_kpis').insert(data)
  return { error: error?.message ?? null }
}

export async function deleteKPI(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('company_kpis').delete().eq('id', id)
  return { error: error?.message ?? null }
}
