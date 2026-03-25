'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function saveDocument(data: {
  company_id: string
  file_url: string
  file_name: string
  type: string
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('documents').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteDocument(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
