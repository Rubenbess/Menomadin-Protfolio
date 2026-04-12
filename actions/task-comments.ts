'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function addCommentToTask(taskId: string, content: string, mentionedUserIds: string[] = []) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // author_id stores the auth user UUID (task_comments_author_id_fkey was dropped)
  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert([{ task_id: taskId, author_id: user.id, content, is_activity: false }])
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/tasks`)
  return { data: comment }
}

export async function updateComment(commentId: string, content: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify user is comment author
  const { data: comment } = await supabase
    .from('task_comments')
    .select('author_id')
    .eq('id', commentId)
    .single()

  if (!comment || comment.author_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { data: updated, error } = await supabase
    .from('task_comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/tasks`)
  return { data: updated }
}

export async function deleteComment(commentId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify user is comment author
  const { data: comment } = await supabase
    .from('task_comments')
    .select('author_id')
    .eq('id', commentId)
    .single()

  if (!comment || comment.author_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId)

  if (error) return { error: error.message }

  revalidatePath(`/tasks`)
  return { data: { success: true } }
}

export async function getTaskComments(taskId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: rawComments, error } = await supabase
    .from('task_comments')
    .select(`
      id,
      task_id,
      author_id,
      content,
      is_activity,
      created_at,
      updated_at
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }

  // Fetch author info separately to avoid array nesting issues
  if (!rawComments || rawComments.length === 0) {
    return { comments: [], error: null }
  }

  const authorIds = [...new Set(rawComments.map(c => c.author_id))]
  const { data: authors } = await supabase
    .from('team_members')
    .select('id, name, email, role, color, job_title, phone, linkedin_url, initials, updated_at, created_at')
    .in('id', authorIds)  // team_members.id IS the auth user UUID

  const authorMap = new Map(authors?.map(a => [a.id, a]) || [])
  const comments = rawComments.map(c => ({
    ...c,
    author: authorMap.get(c.author_id),
  }))

  return { comments, error: null }
}
