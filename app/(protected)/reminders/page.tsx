import { createServerSupabaseClient } from '@/lib/supabase-server'
import RemindersClient from './RemindersClient'
import type { Reminder, Company, Task } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function RemindersPage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: reminders }, { data: companies }, { data: tasks }] = await Promise.all([
    supabase.from('reminders').select('*').order('due_date', { ascending: true }),
    supabase.from('companies').select('id, name').order('name'),
    supabase.from('tasks').select('*').neq('status', 'Done').neq('status', 'Cancelled').order('due_date', { ascending: true }),
  ])

  return (
    <RemindersClient
      reminders={(reminders ?? []) as Reminder[]}
      tasks={(tasks ?? []) as Task[]}
      companies={(companies ?? []) as Pick<Company, 'id' | 'name'>[]}
    />
  )
}
