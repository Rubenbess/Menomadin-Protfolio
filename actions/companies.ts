'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function createCompany(data: {
  name: string
  sector: string
  strategy: string
  hq: string
  status: string
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('companies').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateCompany(
  id: string,
  data: { name: string; sector: string; strategy: string; hq: string; status: string }
) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('companies').update(data).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteCompany(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
