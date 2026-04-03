'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export type EntityType = 'company' | 'investment' | 'contact' | 'document' | 'task' | 'round' | 'safe'
export type ActivityAction = 'created' | 'updated' | 'deleted'

interface LogActivityParams {
  entityType: EntityType
  entityId: string
  action: ActivityAction
  fieldChanged?: string
  oldValue?: string | number | boolean
  newValue?: string | number | boolean
  metadata?: Record<string, any>
}

export async function logActivity({
  entityType,
  entityId,
  action,
  fieldChanged,
  oldValue,
  newValue,
  metadata,
}: LogActivityParams) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    const { error } = await supabase.from('activities').insert({
      entity_type: entityType,
      entity_id: entityId,
      actor_id: user.id,
      action,
      field_changed: fieldChanged || null,
      old_value: oldValue ? String(oldValue) : null,
      new_value: newValue ? String(newValue) : null,
      metadata: metadata || null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Activity logging error:', error)
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    console.error('Activity logging exception:', err)
    return { error: 'Failed to log activity' }
  }
}

export async function getActivities(
  entityType?: EntityType,
  entityId?: string,
  limit = 50
) {
  try {
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('activities')
      .select(
        `
        id,
        entity_type,
        entity_id,
        actor_id,
        action,
        field_changed,
        old_value,
        new_value,
        created_at,
        metadata
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    const { data, error } = await query

    if (error) {
      return { error: error.message, activities: null }
    }

    return { error: null, activities: data || [] }
  } catch (err) {
    console.error('Get activities error:', err)
    return { error: 'Failed to fetch activities', activities: null }
  }
}

export async function getActivityFeed(limit = 20) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('activities')
      .select(
        `
        id,
        entity_type,
        entity_id,
        actor_id,
        action,
        field_changed,
        old_value,
        new_value,
        created_at,
        metadata
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { error: error.message, activities: null }
    }

    return { error: null, activities: data || [] }
  } catch (err) {
    console.error('Get activity feed error:', err)
    return { error: 'Failed to fetch activity feed', activities: null }
  }
}
