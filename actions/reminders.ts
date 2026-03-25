'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

interface ReminderData {
  company_id: string | null
  title: string
  due_date: string
  category: string
  notes: string | null
}

export async function createReminder(data: ReminderData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('reminders').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateReminder(id: string, data: ReminderData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('reminders').update(data).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function toggleReminder(id: string, completed: boolean) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('reminders').update({ completed }).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteReminder(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
