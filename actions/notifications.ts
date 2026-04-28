'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { NotificationType } from '@/lib/types'

// All four functions return `{ error }` so callers can react to a failure
// (toast, retry) instead of seeing a silent success when nothing changed.
// Pre-existing void-returning callers still type-check — they just discard the result.

export async function createNotification(data: {
  type: NotificationType
  title: string
  body?: string | null
  company_id?: string | null
  link?: string | null
}): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('notifications').insert({
    type:       data.type,
    title:      data.title,
    body:       data.body ?? null,
    company_id: data.company_id ?? null,
    link:       data.link ?? null,
    read:       false,
  })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false)
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteNotification(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}
