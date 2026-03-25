'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function createCapTableEntry(data: {
  company_id: string
  round_id: string | null
  shareholder_name: string
  ownership_percentage: number
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('cap_table').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteCapTableEntry(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('cap_table').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
