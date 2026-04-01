import { createServerSupabaseClient } from '@/lib/supabase-server'
import TasksClient from './TasksClient'
import type { TaskWithRelations } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createServerSupabaseClient()

  // Fetch tasks with relations
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      creator:created_by(id, name, color),
      completed_by_user:completed_by(id, name),
      company:company_id(id, name),
      pipeline_deal:pipeline_deal_id(id, name),
      contact:contact_id(id, name),
      assignees:task_assignees(
        id,
        task_id,
        assigned_to,
        assigned_at,
        assigned_by,
        team_member:assigned_to(id, name, color)
      ),
      labels:task_label_links(
        id,
        label:label_id(id, name, color)
      ),
      comments:task_comments(
        id,
        task_id,
        author_id,
        content,
        created_at,
        updated_at,
        is_activity,
        author:author_id(id, name, color)
      ),
      activities:task_activities(
        id,
        task_id,
        actor_id,
        action_type,
        old_value,
        new_value,
        created_at
      ),
      attachments:task_attachments(
        id,
        task_id,
        file_url,
        file_name,
        file_size,
        uploaded_by,
        created_at
      ),
      recurrence_rule:recurrence_rule_id(*)
    `)
    .order('created_at', { ascending: false })

  // Fetch all labels for the label selector
  const { data: allLabels } = await supabase
    .from('task_labels')
    .select('*')
    .order('name', { ascending: true })

  // Fetch team members for assignee selector
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('id, name, color')
    .order('name', { ascending: true })

  // Fetch companies for company filter/selector
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching tasks:', error)
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Failed to load tasks. Please try again.</p>
      </div>
    )
  }

  return (
    <TasksClient
      initialTasks={(tasks || []) as TaskWithRelations[]}
      allLabels={allLabels || []}
      teamMembers={teamMembers || []}
      companies={companies || []}
    />
  )
}
