'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { AutomationTrigger, AutomationAction } from '@/lib/types'

export async function createAutomationRule(data: {
  name: string
  trigger_type: AutomationTrigger
  action_type: AutomationAction
  config: Record<string, any>
}) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rule, error } = await supabase
    .from('task_automation_rules')
    .insert([
      {
        name: data.name,
        trigger_type: data.trigger_type,
        action_type: data.action_type,
        config: data.config,
        created_by: user.id,
        is_active: true,
      },
    ])
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { data: rule }
}

export async function updateAutomationRule(
  ruleId: string,
  data: {
    name?: string
    is_active?: boolean
    config?: Record<string, any>
  }
) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: rule, error } = await supabase
    .from('task_automation_rules')
    .update(data)
    .eq('id', ruleId)
    .eq('created_by', user.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { data: rule }
}

export async function deleteAutomationRule(ruleId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('task_automation_rules')
    .delete()
    .eq('id', ruleId)
    .eq('created_by', user.id)

  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { data: { success: true } }
}

export async function getAutomationRules() {
  const supabase = await createServerSupabaseClient()

  const { data: rules, error } = await supabase
    .from('task_automation_rules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  return { data: rules }
}

// Trigger functions (called by other actions when events happen)

export async function triggerAutomationRules(trigger: AutomationTrigger, context: Record<string, any>) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Get all active rules for this trigger
  const { data: rules } = await supabase
    .from('task_automation_rules')
    .select('*')
    .eq('trigger_type', trigger)
    .eq('is_active', true)

  if (!rules) return

  for (const rule of rules) {
    if (rule.action_type === 'create_task') {
      // Create task from template
      const templateId = rule.config.template_id
      if (!templateId) continue

      // Get template
      const { data: template } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (!template) continue

      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + (template.template_content?.due_days || 7))

      await supabase
        .from('tasks')
        .insert([
          {
            title: template.template_content?.title || template.name,
            description: template.template_content?.description,
            status: 'To do',
            priority: template.template_content?.priority || 'medium',
            due_date: dueDate.toISOString().split('T')[0],
            company_id: context.company_id,
            created_by: user.id,
            template_id: templateId,
          },
        ])
    } else if (rule.action_type === 'notify_team') {
      await supabase.from('notifications').insert({
        type: 'general',
        title: rule.config.title ?? rule.name,
        body: rule.config.message ?? null,
        company_id: context.company_id ?? null,
        link: context.company_id ? `/companies/${context.company_id}` : null,
      })
    } else if (rule.action_type === 'assign_to') {
      const assigneeId = rule.config.assignee_id as string | undefined
      const taskId = context.task_id as string | undefined
      if (assigneeId && taskId) {
        await supabase.from('task_assignees').upsert({
          task_id: taskId,
          assigned_to: assigneeId,
          assigned_by: user.id,
        }, { onConflict: 'task_id,assigned_to' })
      }
    }
  }
}
