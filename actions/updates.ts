'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function createUpdate(data: {
  company_id: string
  date: string
  category: string
  title: string
  notes: string | null
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('company_updates').insert(data)
  return { error: error?.message ?? null }
}

export async function deleteUpdate(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('company_updates').delete().eq('id', id)
  return { error: error?.message ?? null }
}
