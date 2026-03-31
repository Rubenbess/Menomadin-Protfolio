'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { TeamMember, TeamInvite, UserRole } from '@/lib/types'

export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getTeamInvites(): Promise<TeamInvite[]> {
  const supabase = await createServerSupabaseClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('team_invites')
    .select('*')
    .eq('invited_by', user.user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function inviteTeamMember(email: string, role: UserRole) {
  const supabase = await createServerSupabaseClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  // Check if user has admin role
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', user.user.id)
    .single()

  if (teamMember?.role !== 'admin') {
    throw new Error('Only admins can invite team members')
  }

  // Check if user already exists in team
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    throw new Error('User is already a team member')
  }

  // Create invite
  const { error } = await supabase.from('team_invites').insert({
    email,
    role,
    invited_by: user.user.id,
  })

  if (error) throw error
  revalidatePath('/settings/team')
}

export async function acceptTeamInvite(inviteId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  // Get the invite
  const { data: invite, error: inviteError } = await supabase
    .from('team_invites')
    .select('*')
    .eq('id', inviteId)
    .single()

  if (inviteError) throw inviteError
  if (!invite) throw new Error('Invite not found')

  // Verify email matches
  if (invite.email !== user.user.email) {
    throw new Error('Invite email does not match')
  }

  // Create team member
  const { error: createError } = await supabase.from('team_members').insert({
    user_id: user.user.id,
    name: user.user.user_metadata?.name || user.user.email?.split('@')[0] || 'Team Member',
    email: user.user.email || '',
    role: invite.role,
  })

  if (createError) throw createError

  // Mark invite as accepted
  const { error: updateError } = await supabase
    .from('team_invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', inviteId)

  if (updateError) throw updateError
  revalidatePath('/settings/team')
}

export async function removeTeamMember(userId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  // Check if requester is admin
  const { data: requester } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', user.user.id)
    .single()

  if (requester?.role !== 'admin') {
    throw new Error('Only admins can remove team members')
  }

  // Prevent removing self
  if (userId === user.user.id) {
    throw new Error('Cannot remove yourself from the team')
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('user_id', userId)

  if (error) throw error
  revalidatePath('/settings/team')
}

export async function updateTeamMemberRole(userId: string, role: UserRole) {
  const supabase = await createServerSupabaseClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  // Check if requester is admin
  const { data: requester } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', user.user.id)
    .single()

  if (requester?.role !== 'admin') {
    throw new Error('Only admins can update team roles')
  }

  // Prevent demoting self from admin
  if (userId === user.user.id && role !== 'admin') {
    throw new Error('Cannot demote yourself from admin')
  }

  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('user_id', userId)

  if (error) throw error
  revalidatePath('/settings/team')
}

export async function deleteTeamInvite(inviteId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  // Check if requester is admin
  const { data: requester } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', user.user.id)
    .single()

  if (requester?.role !== 'admin') {
    throw new Error('Only admins can delete invites')
  }

  const { error } = await supabase
    .from('team_invites')
    .delete()
    .eq('id', inviteId)

  if (error) throw error
  revalidatePath('/settings/team')
}

// Initialize team for first-time users (called from signup flow)
export async function initializeTeamForNewUser(userId: string, email: string, name?: string) {
  const supabase = await createServerSupabaseClient()

  // Check if user is already a team member
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) return // Already initialized

  // Create team member as admin (first user)
  const { error } = await supabase.from('team_members').insert({
    user_id: userId,
    name: name || email?.split('@')[0] || 'Team Member',
    email: email,
    role: 'admin' as UserRole,
  })

  if (error) throw error
}
