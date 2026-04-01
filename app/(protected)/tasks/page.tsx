import { createServerSupabaseClient } from '@/lib/supabase-server'
import TasksClient from './TasksClient'
import type { TaskWithRelations } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createServerSupabaseClient()

  // Fetch tasks with basic data (relations will be fetched separately if needed)
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
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
