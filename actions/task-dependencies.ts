'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { TaskStatus } from '@/lib/types'

export interface SimpleTask {
  id: string
  title: string
  status: TaskStatus
}

export async function addTaskDependency(taskId: string, parentTaskId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Prevent circular dependencies
  const { data: dependencies } = await supabase
    .from('tasks')
    .select('parent_task_id')
    .eq('id', parentTaskId)

  if (dependencies && dependencies[0]?.parent_task_id === taskId) {
    return { error: 'Would create circular dependency' }
  }

  // Update task with parent
  const { error } = await supabase
    .from('tasks')
    .update({ parent_task_id: parentTaskId })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath(`/tasks`)
  return { data: { success: true } }
}

export async function removeTaskDependency(taskId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('tasks')
    .update({ parent_task_id: null })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath(`/tasks`)
  return { data: { success: true } }
}

export async function getTaskDependencies(taskId: string) {
  const supabase = await createServerSupabaseClient()

  // Get parent task
  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, status, parent_task_id')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Task not found', parentTask: null as SimpleTask | null, blockedBy: [] as SimpleTask[] }

  // Get parent task details
  let parentTask: SimpleTask | null = null
  if (task.parent_task_id) {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status')
      .eq('id', task.parent_task_id)
      .single()
    if (data) {
      parentTask = {
        id: data.id,
        title: data.title,
        status: data.status as any,
      }
    }
  }

  // Get child tasks (tasks blocked by this task)
  const { data: childTasks } = await supabase
    .from('tasks')
    .select('id, title, status')
    .eq('parent_task_id', taskId)

  const blockedByTasks = (childTasks || []).map(t => ({
    id: t.id,
    title: t.title,
    status: t.status as any,
  }))

  return {
    error: null,
    parentTask,
    blockedBy: blockedByTasks,
  }
}

export async function getTaskDependencyTree(taskId: string) {
  const supabase = await createServerSupabaseClient()

  // Fetch task with parent and child relationships
  const { data: task } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      status,
      parent_task_id,
      children:tasks!tasks_parent_task_id_fkey(id, title, status)
    `)
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Task not found', tree: null }

  // Get parent chain (traverse upwards)
  let parentChain = []
  let currentId = task.parent_task_id
  const visited = new Set<string>()

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const { data: parent } = await supabase
      .from('tasks')
      .select('id, title, status, parent_task_id')
      .eq('id', currentId)
      .single()

    if (parent) {
      parentChain.unshift(parent)
      currentId = parent.parent_task_id
    } else {
      break
    }
  }

  return {
    error: null,
    tree: {
      task,
      parentChain,
    },
  }
}

export async function countDependencies(taskId: string) {
  const supabase = await createServerSupabaseClient()

  // Count completed parent task dependencies
  const { data: task } = await supabase
    .from('tasks')
    .select('parent_task_id')
    .eq('id', taskId)
    .single()

  if (!task?.parent_task_id) {
    return { completed: 0, total: 0 }
  }

  // This is a simplified version - in production you'd traverse the entire dependency tree
  const { data: parent } = await supabase
    .from('tasks')
    .select('status')
    .eq('id', task.parent_task_id)
    .single()

  return {
    completed: parent?.status === 'Done' ? 1 : 0,
    total: 1,
  }
}
