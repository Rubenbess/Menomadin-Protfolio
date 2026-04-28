'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { TaskEmailAttachment } from '@/lib/types'

// Note: file uploads go through POST /api/tasks/emails (regular route
// handler), not a server action. Server actions ship an RSC payload with
// the response, and any failure in that payload generation surfaces on
// the client as the opaque "An error occurred in the Server Components
// render" toast — even when the action itself succeeded. The route
// handler returns a plain JSON body the client can read end-to-end.

export async function getTaskEmailAttachments(
  taskId: string
): Promise<{ error: string | null; attachments: TaskEmailAttachment[] }> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('task_email_attachments')
    .select('*')
    .eq('task_id', taskId)
    .order('attached_at', { ascending: false })

  if (error) return { error: error.message, attachments: [] }
  return { error: null, attachments: (data ?? []) as TaskEmailAttachment[] }
}

export async function setEmailAttachmentPrivacy(
  id: string,
  isPrivate: boolean
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('task_email_attachments')
    .update({ is_private: isPrivate })
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function detachEmailFromTask(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('task_email_attachments')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}
