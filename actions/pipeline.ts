'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function createPipelineEntry(data: {
  name: string
  sector: string
  stage: string
  status: string
  notes: string | null
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('pipeline').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function updatePipelineEntry(
  id: string,
  data: { name: string; sector: string; stage: string; status: string; notes: string | null }
) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('pipeline').update(data).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deletePipelineEntry(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('pipeline').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
