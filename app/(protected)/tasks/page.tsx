import { createServerSupabaseClient } from '@/lib/supabase-server'
import TasksClient from './TasksClient'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createServerSupabaseClient()

  const [tasksRes, companiesRes, teamMembersRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, companies(id,name), team_members(id,name,color,role), task_participants(team_member_id, team_members(id,name,color))')
      .order('created_at', { ascending: false }),
    supabase
      .from('companies')
      .select('id, name')
      .order('name'),
    supabase
      .from('team_members')
      .select('*')
      .order('name'),
  ])

  const tasks = tasksRes.data ?? []
  const companies = companiesRes.data ?? []
  const teamMembers = teamMembersRes.data ?? []

  return (
    <TasksClient
      tasks={tasks}
      companies={companies}
      teamMembers={teamMembers}
    />
  )
}
