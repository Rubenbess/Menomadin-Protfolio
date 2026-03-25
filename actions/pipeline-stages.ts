'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createStage(data: { name: string; color: string; position: number }) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('pipeline_stages').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/pipeline')
  return { error: null }
}

export async function updateStage(id: string, data: { name?: string; color?: string; position?: number }) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('pipeline_stages').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/pipeline')
  return { error: null }
}

export async function deleteStage(id: string, stageName: string) {
  const supabase = await createServerSupabaseClient()
  // Move all cards in this stage to null / first stage before deleting
  await supabase.from('pipeline').update({ status: '' }).eq('status', stageName)
  const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/pipeline')
  return { error: null }
}

export async function reorderStages(stages: { id: string; position: number }[]) {
  const supabase = await createServerSupabaseClient()
  await Promise.all(
    stages.map(({ id, position }) =>
      supabase.from('pipeline_stages').update({ position }).eq('id', id)
    )
  )
  revalidatePath('/pipeline')
  return { error: null }
}

export async function movePipelineCard(cardId: string, newStatus: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('pipeline').update({ status: newStatus }).eq('id', cardId)
  if (error) return { error: error.message }
  return { error: null }
}
