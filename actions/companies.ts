'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function createCompany(data: {
  name: string
  sector: string
  strategy: string
  hq: string
  status: string
  description: string | null
  logo_url: string | null
  entry_stage: string | null
  investment_owner: string | null
  board_seat: string | null
}) {
  const supabase = await createServerSupabaseClient()
  const { data: company, error } = await supabase.from('companies').insert(data).select('id').single()
  if (error) return { error: error.message, id: null }
  return { error: null, id: company.id }
}

export async function updateCompany(
  id: string,
  data: { name: string; sector: string; strategy: string; hq: string; status: string; description: string | null; logo_url: string | null; entry_stage: string | null; investment_owner: string | null; board_seat: string | null }
) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('companies').update(data).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteCompany(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function upsertContacts(
  companyId: string,
  contacts: { name: string; position: string }[]
) {
  const supabase = await createServerSupabaseClient()
  await supabase.from('contacts').delete().eq('company_id', companyId)
  if (contacts.length === 0) return { error: null }
  const { error } = await supabase.from('contacts').insert(
    contacts.map(c => ({ ...c, company_id: companyId }))
  )
  return { error: error?.message ?? null }
}
