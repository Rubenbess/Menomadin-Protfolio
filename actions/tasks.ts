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

export async function createTask(data: TaskData, participantIds: string[] = []) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: task, error } = await supabase
      .from('tasks')
      .insert(data)
      .select('id')
      .single()

    if (error) {
      console.error('Task creation error:', error)
      return { error: error.message }
    }

    if (participantIds.length > 0) {
      const { error: participantError } = await supabase
        .from('task_participants')
        .insert(participantIds.map(id => ({ task_id: task.id, team_member_id: id })))

      if (participantError) {
        console.error('Participant error:', participantError)
      }
    }

    revalidatePath('/tasks')
    return { error: null }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'Failed to create task' }
  }
}

export async function updateTask(id: string, data: Partial<TaskData>, participantIds?: string[]) {
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('tasks').update(data).eq('id', id)

    if (error) {
      console.error('Update error:', error)
      return { error: error.message }
    }

    if (participantIds !== undefined) {
      await supabase.from('task_participants').delete().eq('task_id', id)
      if (participantIds.length > 0) {
        await supabase
          .from('task_participants')
          .insert(participantIds.map(id => ({ task_id: id, team_member_id: id })))
      }
    }

    revalidatePath('/tasks')
    return { error: null }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'Failed to update task' }
  }
}

export async function deleteTask(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('tasks').delete().eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      return { error: error.message }
    }

    revalidatePath('/tasks')
    return { error: null }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'Failed to delete task' }
  }
}
