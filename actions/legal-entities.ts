'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function getLegalEntities() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('legal_entities')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function createLegalEntity(data: { name: string; cap_table_alias?: string | null }) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('legal_entities').insert({
    name: data.name.trim(),
    cap_table_alias: data.cap_table_alias?.trim() || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/settings/legal-entities')
  return { error: null }
}

export async function updateLegalEntity(id: string, data: { name: string; cap_table_alias?: string | null }) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('legal_entities')
    .update({ name: data.name.trim(), cap_table_alias: data.cap_table_alias?.trim() || null })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings/legal-entities')
  return { error: null }
}

export async function deleteLegalEntity(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('legal_entities').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/settings/legal-entities')
  return { error: null }
}
