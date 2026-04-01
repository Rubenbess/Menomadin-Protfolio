'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createNotification } from './notifications'
import type { Task, TaskStatus } from '@/lib/types'

// ─── CORE TASK OPERATIONS ───────────────────────────────────────────────────

export async function createTask(data: {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: 'high' | 'medium' | 'low'
  due_date?: string | null
  start_date?: string | null
  company_id?: string | null
  pipeline_deal_id?: string | null
  contact_id?: string | null
  internal_project_id?: string | null
  assignee_ids?: string[]
}) {
  const supabase = await createServerSupabaseClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated', id: null }

  const taskData = {
    title: data.title,
    description: data.description ?? null,
    status: (data.status ?? 'To do') as TaskStatus,
    priority: data.priority ?? 'medium',
    due_date: data.due_date ?? null,
    start_date: data.start_date ?? null,
    company_id: data.company_id ?? null,
    pipeline_deal_id: data.pipeline_deal_id ?? null,
    contact_id: data.contact_id ?? null,
    internal_project_id: data.internal_project_id ?? null,
    is_recurring: false,
    recurrence_rule_id: null,
    template_id: null,
    created_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select('*')
    .single()

  if (error) return { error: error.message, data: null }

  // Add assignees if provided
  if (data.assignee_ids && data.assignee_ids.length > 0) {
    const assignees = data.assignee_ids.map(id => ({
      task_id: task.id,
      assigned_to: id,
      assigned_by: user.id,
    }))
    await supabase.from('task_assignees').insert(assignees)
  }

  revalidatePath('/tasks')

  // Create notification
  await createNotification({
    type: 'general',
    title: 'Task created',
    body: data.title,
    company_id: data.company_id ?? null,
    link: `/tasks`,
  })

  // Fetch the complete task with relations
  const { data: fullTask } = await supabase
    .from('tasks')
    .select(`
      *,
      assignees:task_assignees(
        id,
        task_id,
        assigned_to,
        assigned_at,
        assigned_by,
        team_member:team_members(id, name, color)
      ),
      company:companies(id, name)
    `)
    .eq('id', task.id)
    .single()

  return { error: null, data: fullTask || task }
}

export async function updateTask(id: string, data: Partial<Task>) {
  const supabase = await createServerSupabaseClient()

  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return { error: error.message, data: null }

  revalidatePath('/tasks')

  // Fetch the complete task with relations
  const { data: fullTask } = await supabase
    .from('tasks')
    .select(`
      *,
      assignees:task_assignees(
        id,
        task_id,
        assigned_to,
        assigned_at,
        assigned_by,
        team_member:team_members(id, name, color)
      ),
      company:companies(id, name)
    `)
    .eq('id', id)
    .single()

  return { error: null, data: fullTask || task }
}

export async function deleteTask(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function completeTask(id: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'Done',
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  // Log activity
  await createTaskActivity(id, user.id, 'completed', null, 'Done')

  revalidatePath('/tasks')
  return { error: null }
}

export async function cancelTask(id: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'Cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  // Log activity
  await createTaskActivity(id, user.id, 'cancelled', null, 'Cancelled')

  revalidatePath('/tasks')
  return { error: null }
}

// ─── ASSIGNEE MANAGEMENT ────────────────────────────────────────────────────

export async function assignTask(taskId: string, assigneeId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // Check if already assigned
  const { data: existing } = await supabase
    .from('task_assignees')
    .select('id')
    .eq('task_id', taskId)
    .eq('assigned_to', assigneeId)
    .single()

  if (existing) return { error: null } // Already assigned

  const { error } = await supabase.from('task_assignees').insert({
    task_id: taskId,
    assigned_to: assigneeId,
    assigned_by: user.id,
  })

  if (error) return { error: error.message }

  // Log activity
  await createTaskActivity(taskId, user.id, 'assignee_added', null, assigneeId)

  revalidatePath('/tasks')

  // Create notification for assignee
  await createNotification({
    type: 'general',
    title: 'Task assigned to you',
    link: `/tasks`,
  })

  return { error: null }
}

export async function removeAssignee(taskId: string, assigneeId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId)
    .eq('assigned_to', assigneeId)

  if (error) return { error: error.message }

  // Log activity
  await createTaskActivity(taskId, user.id, 'assignee_removed', assigneeId, null)

  revalidatePath('/tasks')
  return { error: null }
}

// ─── COMMENTS ───────────────────────────────────────────────────────────────

export async function addComment(taskId: string, content: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated', id: null }

  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      author_id: user.id,
      content,
      is_activity: false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message, id: null }

  revalidatePath('/tasks')
  return { error: null, id: comment.id }
}

export async function updateComment(id: string, content: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('task_comments')
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function deleteComment(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('task_comments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

// ─── ACTIVITY LOGGING ───────────────────────────────────────────────────────

async function createTaskActivity(
  taskId: string,
  actorId: string,
  actionType: string,
  oldValue: string | null,
  newValue: string | null
) {
  const supabase = await createServerSupabaseClient()

  await supabase.from('task_activities').insert({
    task_id: taskId,
    actor_id: actorId,
    action_type: actionType,
    old_value: oldValue,
    new_value: newValue,
    metadata: null,
  })
}

// ─── LABELS ─────────────────────────────────────────────────────────────────

export async function createLabel(name: string, color?: string) {
  const supabase = await createServerSupabaseClient()

  const { data: label, error } = await supabase
    .from('task_labels')
    .insert({
      name,
      color: color ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message, id: null }
  return { error: null, id: label.id }
}

export async function addLabelToTask(taskId: string, labelId: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('task_label_links').insert({
    task_id: taskId,
    label_id: labelId,
  })

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function removeLabelFromTask(taskId: string, labelId: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('task_label_links')
    .delete()
    .eq('task_id', taskId)
    .eq('label_id', labelId)

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

// ─── TEMPLATES ──────────────────────────────────────────────────────────────

export async function createTaskFromTemplate(
  templateId: string,
  overrides?: Partial<Task>
) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated', id: null }

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateError || !template) return { error: 'Template not found', id: null }

  // Extract template content
  const content = template.template_content || {}

  const taskData = {
    title: overrides?.title ?? content.title ?? 'New Task',
    description: overrides?.description ?? content.description ?? null,
    status: overrides?.status ?? 'To do' as TaskStatus,
    priority: overrides?.priority ?? 'medium',
    due_date: overrides?.due_date ?? null,
    start_date: overrides?.start_date ?? null,
    company_id: overrides?.company_id ?? null,
    pipeline_deal_id: overrides?.pipeline_deal_id ?? null,
    contact_id: overrides?.contact_id ?? null,
    internal_project_id: overrides?.internal_project_id ?? null,
    template_id: templateId,
    is_recurring: false,
    recurrence_rule_id: null,
    created_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select('id')
    .single()

  if (error) return { error: error.message, id: null }

  revalidatePath('/tasks')
  return { error: null, id: task.id }
}

// ─── BATCH OPERATIONS ───────────────────────────────────────────────────────

export async function bulkUpdateTaskStatus(taskIds: string[], status: TaskStatus) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('tasks')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .in('id', taskIds)

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}

export async function bulkDeleteTasks(taskIds: string[]) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('tasks').delete().in('id', taskIds)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { error: null }
}
