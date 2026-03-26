'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface ContactData {
  name: string
  position: string | null
  email: string | null
  phone: string | null
  address: string | null
  linkedin_url: string | null
  company_id: string | null
  notes: string | null
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
