import { createServerSupabaseClient } from './supabase-server'
import type { UserRole } from './types'

export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return null

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', user.user.id)
      .single()

    return teamMember?.role ?? null
  } catch {
    return null
  }
}

export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole()
  return role === 'admin'
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data: user } = await supabase.auth.getUser()
  return user.user?.id ?? null
}

export async function isTeamMember(): Promise<boolean> {
  const role = await getCurrentUserRole()
  return role !== null
}
