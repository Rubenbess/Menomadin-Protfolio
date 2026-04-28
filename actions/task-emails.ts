'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAccessTokenForUser, getMessage } from '@/lib/microsoft-graph'
import {
  snapshotFromGraphMessage,
  snapshotFromEml,
  snapshotFromMsg,
  type EmailSnapshot,
} from '@/lib/email-snapshot'
import type { TaskEmailAttachment } from '@/lib/types'

type Result<T> = { error: string | null; data: T | null }

// ─── Read ───────────────────────────────────────────────────────────────────

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

// ─── Insert helper ──────────────────────────────────────────────────────────

async function insertSnapshot(args: {
  taskId: string
  source: 'outlook_picker' | 'file_upload'
  isPrivate: boolean
  snapshot: EmailSnapshot
}): Promise<Result<{ id: string }>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  const row = {
    task_id: args.taskId,
    attached_by: user.id,
    is_private: args.isPrivate,
    source: args.source,
    ...args.snapshot,
  }

  const { data, error } = await supabase
    .from('task_email_attachments')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    // Handle the unique-index collision (same Outlook message attached twice)
    if (error.code === '23505') {
      return { error: 'This email is already attached to the task.', data: null }
    }
    return { error: error.message, data: null }
  }

  revalidatePath('/tasks')
  return { error: null, data: { id: data.id } }
}

// ─── Outlook picker ─────────────────────────────────────────────────────────

export async function attachOutlookEmailToTask(args: {
  taskId: string
  messageId: string
  isPrivate?: boolean
}): Promise<Result<{ id: string }>> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  const auth = await getAccessTokenForUser(user.id)
  if (!auth) {
    return {
      error: 'Outlook is not connected. Connect it in Settings → Email Scanner.',
      data: null,
    }
  }

  const message = await getMessage(auth.token, args.messageId)
  if (!message) {
    return { error: 'Could not load the email from Outlook.', data: null }
  }

  return insertSnapshot({
    taskId: args.taskId,
    source: 'outlook_picker',
    isPrivate: args.isPrivate ?? false,
    snapshot: snapshotFromGraphMessage(message),
  })
}

// ─── File upload (.eml / .msg) ──────────────────────────────────────────────

export async function attachEmailFileToTask(
  formData: FormData
): Promise<Result<{ id: string; subject: string | null }>> {
  const taskId = formData.get('taskId')
  const file = formData.get('file')
  const isPrivate = formData.get('isPrivate') === 'true'

  if (typeof taskId !== 'string' || !taskId) {
    return { error: 'Missing taskId', data: null }
  }
  if (!(file instanceof File)) {
    return { error: 'No file provided', data: null }
  }

  const lower = file.name.toLowerCase()
  const isEml = lower.endsWith('.eml')
  const isMsg = lower.endsWith('.msg')
  if (!isEml && !isMsg) {
    return { error: 'Only .eml and .msg files are supported.', data: null }
  }

  // Cap at 25 MB to prevent runaway uploads from filling the DB
  if (file.size > 25 * 1024 * 1024) {
    return { error: 'File is larger than 25 MB.', data: null }
  }

  const buf = Buffer.from(await file.arrayBuffer())

  let snapshot: EmailSnapshot
  try {
    snapshot = isEml ? await snapshotFromEml(buf) : snapshotFromMsg(buf)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to parse email file'
    return { error: msg, data: null }
  }

  const result = await insertSnapshot({
    taskId,
    source: 'file_upload',
    isPrivate,
    snapshot,
  })
  if (result.error || !result.data) return { error: result.error, data: null }

  return { error: null, data: { id: result.data.id, subject: snapshot.subject } }
}

// ─── Privacy + delete ───────────────────────────────────────────────────────

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
  revalidatePath('/tasks')
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
  revalidatePath('/tasks')
  return { error: null }
}
