'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function createUpdate(data: {
  company_id: string
  date: string
  category: string
  title: string
  notes: string | null
}) {
  const supabase = await createServerSupabaseClient()

  // Auto-capture the logged-in user's name as author
  const { data: { user } } = await supabase.auth.getUser()
  let created_by: string | null = null
  if (user) {
    const { data: member } = await supabase
      .from('team_members')
      .select('name')
      .eq('id', user.id)
      .maybeSingle()
    created_by = member?.name ?? null
  }

  const { error } = await supabase.from('company_updates').insert({ ...data, created_by })
  return { error: error?.message ?? null }
}

export async function updateUpdate(id: string, data: {
  date: string
  category: string
  title: string
  notes: string | null
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('company_updates').update(data).eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteUpdate(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('company_updates').delete().eq('id', id)
  return { error: error?.message ?? null }
}
