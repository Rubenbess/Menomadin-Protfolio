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

  // Find the lowest-position remaining stage to receive any orphaned cards.
  // Setting status to '' (the previous behavior) silently orphans cards because
  // pipeline.status uses capitalized stage names — no column matches an empty
  // string and the cards disappear from the board.
  const { data: remainingStages, error: stagesErr } = await supabase
    .from('pipeline_stages')
    .select('name, position')
    .neq('id', id)
    .order('position', { ascending: true })
    .limit(1)
  if (stagesErr) return { error: `Failed to load remaining stages: ${stagesErr.message}` }

  const fallbackName = remainingStages?.[0]?.name
  if (!fallbackName) {
    // Refuse to delete the last stage while it still has cards — there's
    // nowhere to move them and we don't want to orphan or hard-delete them.
    const { count, error: countErr } = await supabase
      .from('pipeline')
      .select('id', { count: 'exact', head: true })
      .eq('status', stageName)
    if (countErr) return { error: `Failed to count cards in stage: ${countErr.message}` }
    if ((count ?? 0) > 0) {
      return { error: 'Cannot delete the last pipeline stage while it still contains cards. Move the cards first.' }
    }
  } else {
    const { error: moveErr } = await supabase
      .from('pipeline')
      .update({ status: fallbackName })
      .eq('status', stageName)
    if (moveErr) return { error: `Failed to move cards out of stage: ${moveErr.message}` }
  }

  const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/pipeline')
  return { error: null }
}

export async function reorderStages(stages: { id: string; position: number }[]) {
  const supabase = await createServerSupabaseClient()
  // Each update returns its own { data, error }. Without inspecting them, a
  // single failed row (RLS, FK) silently desyncs the board from the database.
  const results = await Promise.all(
    stages.map(({ id, position }) =>
      supabase.from('pipeline_stages').update({ position }).eq('id', id)
    )
  )
  const failures = results
    .map((r, i) => (r.error ? { id: stages[i].id, message: r.error.message } : null))
    .filter((x): x is { id: string; message: string } => x !== null)
  if (failures.length > 0) {
    return {
      error: `Failed to reorder ${failures.length} stage(s): ${failures.map(f => `${f.id} (${f.message})`).join('; ')}`,
    }
  }
  revalidatePath('/pipeline')
  return { error: null }
}

export async function movePipelineCard(cardId: string, newStatus: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('pipeline').update({ status: newStatus }).eq('id', cardId)
  if (error) return { error: error.message }
  return { error: null }
}
