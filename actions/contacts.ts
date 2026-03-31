'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { InteractionType } from '@/lib/types'

interface ContactData {
  name: string
  position: string | null
  email: string | null
  phone: string | null
  address: string | null
  linkedin_url: string | null
  company_id: string | null
  notes: string | null
  contact_type: string | null
  relationship_owner: string | null
}

export async function createContact(data: ContactData) {
  const supabase = await createServerSupabaseClient()
  const { data: row, error } = await supabase.from('contacts').insert(data).select('id').single()
  if (error) return { error: error.message, id: null }
  revalidatePath('/contacts')
  return { error: null, id: row.id as string }
}

export async function updateContact(id: string, data: ContactData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('contacts').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contacts')
  return { error: null }
}

export async function deleteContact(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contacts')
  return { error: null }
}

// ── Interaction Log ──────────────────────────────────────────────────────────

export async function createInteraction(data: {
  contact_id: string
  date: string
  interaction_type: InteractionType
  notes: string | null
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('contact_interactions').insert(data)
  if (error) return { error: error.message }
  // Update last_interaction_date on the contact
  await supabase.from('contacts')
    .update({ last_interaction_date: data.date })
    .eq('id', data.contact_id)
    .lt('last_interaction_date', data.date)
  revalidatePath('/contacts')
  return { error: null }
}

export async function deleteInteraction(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('contact_interactions').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contacts')
  return { error: null }
}
