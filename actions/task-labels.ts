'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function createTaskLabel(name: string, color?: string) {
  const supabase = await createServerSupabaseClient()

  // Check if label already exists
  const { data: existing } = await supabase
    .from('task_labels')
    .select('id')
    .eq('name', name)
    .single()

  if (existing) return { error: null, id: existing.id }

  const { data: label, error } = await supabase
    .from('task_labels')
    .insert({
      name,
      color: color ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message, id: null }

  revalidatePath('/tasks')
  return { error: null, id: label.id }
}

export async function updateTaskLabel(id: string, name: string, color?: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('task_labels')
    .update({
      name,
      color: color ?? null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function deleteTaskLabel(id: string) {
  const supabase = await createServerSupabaseClient()

  // Delete all links first
  await supabase.from('task_label_links').delete().eq('label_id', id)

  // Then delete the label
  const { error } = await supabase.from('task_labels').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function addLabelToTask(taskId: string, labelId: string) {
  const supabase = await createServerSupabaseClient()

  // Check if link already exists
  const { data: existing } = await supabase
    .from('task_label_links')
    .select('id')
    .eq('task_id', taskId)
    .eq('label_id', labelId)
    .single()

  if (existing) return { error: null } // Already linked

  const { error } = await supabase.from('task_label_links').insert({
    task_id: taskId,
    label_id: labelId,
  })

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function removeLabelFromTask(taskId: string, labelId: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('task_label_links')
    .delete()
    .eq('task_id', taskId)
    .eq('label_id', labelId)

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function getAllLabels() {
  const supabase = await createServerSupabaseClient()

  const { data: labels, error } = await supabase
    .from('task_labels')
    .select('*')
    .order('name', { ascending: true })

  if (error) return { error: error.message, labels: [] }
  return { error: null, labels }
}

export async function getTaskLabels(taskId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: links, error } = await supabase
    .from('task_label_links')
    .select(`
      id,
      label:label_id(*)
    `)
    .eq('task_id', taskId)

  if (error) return { error: error.message, labels: [] }
  return { error: null, labels: links.map(link => link.label) }
}
