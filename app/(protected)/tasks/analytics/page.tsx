import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import TaskAnalyticsClient from '@/components/TaskMetrics/TaskAnalyticsClient'
import type { TaskWithRelations } from '@/lib/types'

export const metadata = {
  title: 'Task Analytics | Menomadin',
  description: 'View task metrics and analytics',
}

export default async function TaskAnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }

  // Fetch all tasks with relations — assignees hydrated separately to avoid FK cache issues
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
      company:companies(id, name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks:', error)
  }

  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('id, name, color')

  const memberMap = new Map((teamMembers || []).map(m => [m.id, m]))
  const tasksList = ((tasks || []).map(task => ({
    ...task,
    assignees: (task.assignees || []).map((a: any) => ({
      ...a,
      team_member: memberMap.get(a.assigned_to) ?? null,
    })),
  }))) as TaskWithRelations[]

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          <a href="/tasks" className="hover:text-neutral-900 dark:hover:text-white">
            Tasks
          </a>
          <span>/</span>
          <span>Analytics</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Task Analytics
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Monitor task metrics, completion rates, and team productivity
          </p>
        </div>

        {/* Analytics Content */}
        <TaskAnalyticsClient tasks={tasksList} />
      </div>
    </div>
  )
}
