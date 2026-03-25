'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

interface PipelineData {
  name: string
  sector: string
  stage: string
  status: string
  notes: string | null
  hq: string | null
  fundraising_ask: number | null
  lead_partner: string | null
  source: string | null
  internal_score: number | null
  next_steps: string | null
}

export async function createPipelineEntry(data: PipelineData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('pipeline').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function updatePipelineEntry(id: string, data: PipelineData) {
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
