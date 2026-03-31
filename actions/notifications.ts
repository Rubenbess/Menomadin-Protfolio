'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { NotificationType } from '@/lib/types'

export async function createNotification(data: {
  type: NotificationType
  title: string
  body?: string | null
  company_id?: string | null
  link?: string | null
}) {
  const supabase = await createServerSupabaseClient()
  await supabase.from('notifications').insert({
    type:       data.type,
    title:      data.title,
    body:       data.body ?? null,
    company_id: data.company_id ?? null,
    link:       data.link ?? null,
    read:       false,
  })
  revalidatePath('/', 'layout')
}

export async function markNotificationRead(id: string) {
  const supabase = await createServerSupabaseClient()
  await supabase.from('notifications').update({ read: true }).eq('id', id)
  revalidatePath('/', 'layout')
}

export async function markAllNotificationsRead() {
  const supabase = await createServerSupabaseClient()
  await supabase.from('notifications').update({ read: true }).eq('read', false)
  revalidatePath('/', 'layout')
}

export async function deleteNotification(id: string) {
  const supabase = await createServerSupabaseClient()
  await supabase.from('notifications').delete().eq('id', id)
  revalidatePath('/', 'layout')
}
