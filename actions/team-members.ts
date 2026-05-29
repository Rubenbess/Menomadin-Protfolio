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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: caller } = await supabase
    .from('team_members')
    .select('role')
    .eq('id', user.id)
    .single()
  if (caller?.role !== 'admin') return { error: 'Forbidden' }

  const { error } = await supabase.from('team_members').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { error: null }
}

export async function updateTeamMember(id: string, data: Partial<TeamMemberData>) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: caller } = await supabase
    .from('team_members')
    .select('role')
    .eq('id', user.id)
    .single()
  if (caller?.role !== 'admin') return { error: 'Forbidden' }

  // Prevent self-role escalation: strip the role field if caller is updating their own record
  const payload = { ...data }
  if (id === user.id && 'role' in payload) {
    delete payload.role
  }

  const { error } = await supabase.from('team_members').update(payload).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { error: null }
}

export async function deleteTeamMember(id: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: caller } = await supabase
    .from('team_members')
    .select('role')
    .eq('id', user.id)
    .single()
  if (caller?.role !== 'admin') return { error: 'Forbidden' }

  // An admin deleting themselves can produce a zero-admin org. updateTeamMember
  // already strips self-role-escalation (lines above); refuse the same self-target
  // on delete for the same admin-loss reason.
  if (id === user.id) return { error: 'You cannot delete your own account.' }

  const { error } = await supabase.from('team_members').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { error: null }
}
