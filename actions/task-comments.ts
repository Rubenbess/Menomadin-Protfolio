'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function addTaskComment(taskId: string, content: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated', id: null }

  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      author_id: user.id,
      content,
      is_activity: false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message, id: null }

  revalidatePath('/tasks')
  return { error: null, id: comment.id }
}

export async function updateTaskComment(id: string, content: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('task_comments')
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function deleteTaskComment(id: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('task_comments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function getTaskComments(taskId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: comments, error } = await supabase
    .from('task_comments')
    .select(`
      *,
      author:author_id(id, name, color)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message, comments: [] }
  return { error: null, comments }
}
