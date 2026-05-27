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
  company_name: string | null
  notes: string | null
  contact_type: string | null
  relationship_owner: string | null
}

export async function createContact(data: ContactData) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: row, error } = await supabase.from('contacts').insert(data).select('id').single()
    if (error || !row) return { error: error?.message ?? 'Contact not created', id: null }
    revalidatePath('/contacts')
    return { error: null, id: row.id as string }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err), id: null }
  }
}

export async function updateContact(id: string, data: ContactData) {
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('contacts').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/contacts')
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
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
  // Reject malformed dates before interpolating into the PostgREST .or() filter
  // below — a comma, parenthesis, or quote in data.date would corrupt the filter
  // shape (and theoretically allow filter-injection).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { error: 'Invalid interaction date (expected YYYY-MM-DD).' }
  }
  const { error } = await supabase.from('contact_interactions').insert(data)
  if (error) return { error: error.message }
  // Bump last_interaction_date if this interaction is newer than what's
  // recorded — or if the field is still NULL (first interaction with this
  // contact). Without the is.null branch, a contact whose last_interaction_date
  // has never been set never gets it populated.
  const { error: bumpErr } = await supabase.from('contacts')
    .update({ last_interaction_date: data.date })
    .eq('id', data.contact_id)
    .or(`last_interaction_date.is.null,last_interaction_date.lt.${data.date}`)
  if (bumpErr) return { error: `Interaction logged but contact timeline not updated: ${bumpErr.message}` }
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

export async function linkContactToCompany(contactId: string, companyId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('contacts').update({ company_id: companyId }).eq('id', contactId)
  if (error) return { error: error.message }
  revalidatePath('/contacts')
  revalidatePath(`/companies/${companyId}`)
  return { error: null }
}

export async function unlinkContactFromCompany(contactId: string, companyId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('contacts').update({ company_id: null }).eq('id', contactId).eq('company_id', companyId)
  if (error) return { error: error.message }
  revalidatePath('/contacts')
  revalidatePath(`/companies/${companyId}`)
  return { error: null }
}
