import { createServerSupabaseClient } from '@/lib/supabase-server'
import TaskAutomations from '../TaskAutomations'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TaskAutomationsPage() {
  const supabase = await createServerSupabaseClient()

  // Fetch automation rules
  const { data: automationRules, error: rulesError } = await supabase
    .from('task_automation_rules')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch templates for the form
  const { data: templates } = await supabase
    .from('task_templates')
    .select('id, name')
    .order('name', { ascending: true })

  // Fetch team members
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('id, name')
    .order('name', { ascending: true })

  if (rulesError) {
    console.error('Error fetching automation rules:', rulesError)
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading automation rules</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-8">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Tasks
        </Link>
        <h1 className="page-title">Task Automations</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
          Set up rules to automatically create tasks, notify teams, and manage your workflow
        </p>
      </div>

      <TaskAutomations
        automationRules={automationRules || []}
        templates={templates || []}
        teamMembers={teamMembers || []}
      />
    </div>
  )
}
