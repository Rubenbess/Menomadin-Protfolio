'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { RecurrenceFrequency } from '@/lib/types'

export async function createRecurrenceRule(data: {
  frequency: RecurrenceFrequency
  interval: number
  day_of_week?: number | null
  day_of_month?: number | null
  next_occurrence: string
}) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rule, error } = await supabase
    .from('task_recurrence_rules')
    .insert([
      {
        frequency: data.frequency,
        interval: data.interval,
        day_of_week: data.day_of_week || null,
        day_of_month: data.day_of_month || null,
        next_occurrence: data.next_occurrence,
        is_active: true,
        created_by: user.id,
      },
    ])
    .select()
    .single()

  if (error) return { error: error.message }

  return { data: rule, id: rule.id }
}

export async function generateNextRecurringTask(
  recurrenceRuleId: string,
  sourceTaskId: string
) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get source task to copy
  const { data: sourceTask } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', sourceTaskId)
    .single()

  if (!sourceTask) return { error: 'Source task not found' }

  // Get recurrence rule
  const { data: rule } = await supabase
    .from('task_recurrence_rules')
    .select('*')
    .eq('id', recurrenceRuleId)
    .single()

  if (!rule) return { error: 'Recurrence rule not found' }

  // Calculate next occurrence
  const nextDate = new Date(rule.next_occurrence)
  let futureDate = new Date(nextDate)

  switch (rule.frequency) {
    case 'daily':
      futureDate.setDate(futureDate.getDate() + rule.interval)
      break
    case 'weekly':
      futureDate.setDate(futureDate.getDate() + 7 * rule.interval)
      break
    case 'biweekly':
      futureDate.setDate(futureDate.getDate() + 14)
      break
    case 'monthly':
      futureDate.setMonth(futureDate.getMonth() + rule.interval)
      break
    case 'quarterly':
      futureDate.setMonth(futureDate.getMonth() + 3 * rule.interval)
      break
    case 'yearly':
      futureDate.setFullYear(futureDate.getFullYear() + rule.interval)
      break
  }

  // Create new task
  const { data: newTask, error: createError } = await supabase
    .from('tasks')
    .insert([
      {
        title: sourceTask.title,
        description: sourceTask.description,
        status: 'To do',
        priority: sourceTask.priority,
        due_date: futureDate.toISOString().split('T')[0],
        company_id: sourceTask.company_id,
        created_by: user.id,
        is_recurring: true,
        recurrence_rule_id: recurrenceRuleId,
        template_id: sourceTask.template_id,
      },
    ])
    .select()
    .single()

  if (createError) return { error: createError.message }

  // Update recurrence rule's next occurrence
  await supabase
    .from('task_recurrence_rules')
    .update({
      next_occurrence: futureDate.toISOString().split('T')[0],
      last_generated: new Date().toISOString().split('T')[0],
    })
    .eq('id', recurrenceRuleId)

  revalidatePath('/tasks')
  return { data: newTask }
}

export async function updateRecurrenceRule(
  ruleId: string,
  data: {
    frequency?: RecurrenceFrequency
    interval?: number
    is_active?: boolean
  }
) {
  const supabase = await createServerSupabaseClient()

  const { data: rule, error } = await supabase
    .from('task_recurrence_rules')
    .update(data)
    .eq('id', ruleId)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { data: rule }
}

export async function deleteRecurrenceRule(ruleId: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('task_recurrence_rules')
    .delete()
    .eq('id', ruleId)

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { data: { success: true } }
}
