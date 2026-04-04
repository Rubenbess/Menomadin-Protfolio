'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export interface SavedTaskFilter {
  id: string
  name: string
  description: string | null
  filters: {
    status?: string[]
    priority?: string[]
    company_id?: string
    assignee_id?: string
    due_date_range?: {
      start: string
      end: string
    }
    include_completed?: boolean
    search_query?: string
  }
  is_default?: boolean
  created_at: string
  created_by: string
}

export async function createSavedFilter(name: string, description: string | null, filters: any) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: filter, error } = await supabase
    .from('task_saved_filters')
    .insert([
      {
        name,
        description,
        filters,
        created_by: user.id,
      },
    ])
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/tasks`)
  return { data: filter as SavedTaskFilter }
}

export async function updateSavedFilter(filterId: string, updates: any) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify user is creator
  const { data: filter } = await supabase
    .from('task_saved_filters')
    .select('created_by')
    .eq('id', filterId)
    .single()

  if (!filter || filter.created_by !== user.id) {
    return { error: 'Not authorized' }
  }

  const { data: updated, error } = await supabase
    .from('task_saved_filters')
    .update(updates)
    .eq('id', filterId)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/tasks`)
  return { data: updated as SavedTaskFilter }
}

export async function deleteSavedFilter(filterId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify user is creator
  const { data: filter } = await supabase
    .from('task_saved_filters')
    .select('created_by')
    .eq('id', filterId)
    .single()

  if (!filter || filter.created_by !== user.id) {
    return { error: 'Not authorized' }
  }

  const { error } = await supabase
    .from('task_saved_filters')
    .delete()
    .eq('id', filterId)

  if (error) return { error: error.message }

  revalidatePath(`/tasks`)
  return { data: { success: true } }
}

export async function getSavedFilters() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', filters: [] }

  const { data: filters, error } = await supabase
    .from('task_saved_filters')
    .select('*')
    .eq('created_by', user.id)
    .order('name', { ascending: true })

  if (error) return { error: error.message, filters: [] }

  return { filters: (filters || []) as SavedTaskFilter[], error: null }
}

export async function getSavedFilter(filterId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: filter, error } = await supabase
    .from('task_saved_filters')
    .select('*')
    .eq('id', filterId)
    .single()

  if (error) return { error: error.message, filter: null }

  return { filter: filter as SavedTaskFilter, error: null }
}

export async function setDefaultFilter(filterId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Clear other defaults for this user
  await supabase
    .from('task_saved_filters')
    .update({ is_default: false })
    .eq('created_by', user.id)

  // Set new default
  const { error } = await supabase
    .from('task_saved_filters')
    .update({ is_default: true })
    .eq('id', filterId)

  if (error) return { error: error.message }

  revalidatePath(`/tasks`)
  return { data: { success: true } }
}
