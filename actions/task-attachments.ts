'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function uploadTaskAttachment(
  taskId: string,
  fileName: string,
  fileUrl: string,
  fileSize?: number
) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated', id: null }

  const { data: attachment, error } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      file_name: fileName,
      file_url: fileUrl,
      file_size: fileSize ?? null,
      uploaded_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message, id: null }

  revalidatePath('/tasks')
  return { error: null, id: attachment.id }
}

export async function deleteTaskAttachment(id: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('task_attachments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function getTaskAttachments(taskId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: attachments, error } = await supabase
    .from('task_attachments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, attachments: [] }
  return { error: null, attachments }
}
