'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

interface TeamMemberData {
  id: string
  name: string
  email: string
  role: string | null
  color: string
}

export async function createTeamMember(data: TeamMemberData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('team_members').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { error: null }
}

export async function updateTeamMember(id: string, data: Partial<TeamMemberData>) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('team_members').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { error: null }
}

export async function deleteTeamMember(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('team_members').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { error: null }
}
