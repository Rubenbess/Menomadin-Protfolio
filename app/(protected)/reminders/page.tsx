import { createServerSupabaseClient } from '@/lib/supabase-server'
import RemindersClient from './RemindersClient'
import type { Reminder, Company } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function RemindersPage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: reminders }, { data: companies }] = await Promise.all([
    supabase.from('reminders').select('*').order('due_date', { ascending: true }),
    supabase.from('companies').select('id, name').order('name'),
  ])

  return (
    <RemindersClient
      reminders={(reminders ?? []) as Reminder[]}
      companies={(companies ?? []) as Pick<Company, 'id' | 'name'>[]}
    />
  )
}
