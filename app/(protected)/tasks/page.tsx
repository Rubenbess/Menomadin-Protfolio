import { createServerSupabaseClient } from '@/lib/supabase-server'
import TasksClient from './TasksClient'
import type { TaskWithRelations } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createServerSupabaseClient()

  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || ''

  // Fetch tasks with relations — assignees fetched separately to avoid FK cache issues
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignees:task_assignees(
        id,
        task_id,
        assigned_to,
        assigned_at,
        assigned_by
      ),
      company:companies(id, name),
      pipeline_deal:pipeline(id, name),
      contact:contacts(id, name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks:', JSON.stringify(error), error)
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-mono text-sm">{error.message || JSON.stringify(error)}</p>
      </div>
    )
  }

  // Fetch all labels for the label selector
  const { data: allLabels } = await supabase
    .from('task_labels')
    .select('*')
    .order('name', { ascending: true })

  // Fetch team members for assignee selector and to hydrate assignee details
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('id, name, color')
    .order('name', { ascending: true })

  // Fetch companies for company filter/selector
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .order('name', { ascending: true })

  // Hydrate assignee team_member info from the already-fetched teamMembers list
  const memberMap = new Map((teamMembers || []).map(m => [m.id, m]))
  const hydratedTasks = (tasks || []).map(task => ({
    ...task,
    assignees: (task.assignees || []).map((a: any) => ({
      ...a,
      team_member: memberMap.get(a.assigned_to) ?? null,
    })),
  }))

  return (
    <div className="max-w-full px-6 py-6">
      <TasksClient
        initialTasks={hydratedTasks as TaskWithRelations[]}
        allLabels={allLabels || []}
        teamMembers={teamMembers || []}
        companies={companies || []}
        currentUserId={userId}
      />
    </div>
  )
}
