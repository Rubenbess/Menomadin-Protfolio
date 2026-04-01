import { createServerSupabaseClient } from '@/lib/supabase-server'
import TaskTemplatesClient from './TaskTemplatesClient'
import type { TaskTemplate } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function TaskTemplatesPage() {
  const supabase = await createServerSupabaseClient()

  const { data: templates, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching templates:', error)
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Failed to load templates. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="max-w-full px-6 py-6">
      <TaskTemplatesClient initialTemplates={(templates || []) as TaskTemplate[]} />
    </div>
  )
}
