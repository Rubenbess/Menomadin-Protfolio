'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

interface TaskData {
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  company_id: string | null
  assignee_id: string | null
}

export async function createTask(data: TaskData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('tasks').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { error: null }
}

export async function updateTask(id: string, data: Partial<TaskData>) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('tasks').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { error: null }
}

export async function deleteTask(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { error: null }
}
