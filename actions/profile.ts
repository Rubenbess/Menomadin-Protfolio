'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.trim().slice(0, 2).toUpperCase()
}

export async function updateProfile(updates: {
  name?: string
  job_title?: string | null
  phone?: string | null
  linkedin_url?: string | null
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const payload: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  }
  if (updates.name) {
    payload.initials = deriveInitials(updates.name)
  }

  const { data, error } = await supabase
    .from('team_members')
    .update(payload)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { data }
}

export async function getMyTasks() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tasks: [] }

  const { data: assigneeRows } = await supabase
    .from('task_assignees')
    .select('task_id')
    .eq('assigned_to', user.id)

  const taskIds = (assigneeRows || []).map((r: any) => r.task_id)
  if (taskIds.length === 0) return { tasks: [] }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, company:companies(id, name), pipeline_deal:pipeline(id, name)')
    .in('id', taskIds)
    .not('status', 'in', '("Done","Cancelled")')
    .order('due_date', { ascending: true, nullsFirst: false })

  return { tasks: tasks || [] }
}

export async function getMyPipeline() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { deals: [] }

  const { data: deals } = await supabase
    .from('pipeline')
    .select('id, name, sector, stage, status, fundraising_ask, updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  return { deals: deals || [] }
}

export async function getMyCompanies() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { companies: [] }

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, sector, status, strategy')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })

  return { companies: companies || [] }
}

export async function getMyActivity() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { activities: [] }

  const { data: activities } = await supabase
    .from('activities')
    .select('id, entity_type, entity_id, action, field_changed, old_value, new_value, created_at')
    .eq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return { activities: activities || [] }
}

export async function getAllTeamMembers() {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, email, role, color, job_title, initials')
    .order('name', { ascending: true })

  if (error) return { members: [], error: error.message }
  return { members: data || [] }
}
