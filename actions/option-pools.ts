'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { OptionPool } from '@/lib/types'

type OptionPoolData = Omit<OptionPool, 'id' | 'created_at'>

export async function createOptionPool(data: OptionPoolData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('option_pools').insert(data)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${data.company_id}`)
  return { error: null }
}

export async function updateOptionPool(id: string, data: Partial<OptionPoolData>) {
  const supabase = await createServerSupabaseClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('option_pools').select('company_id').eq('id', id).single()
  if (fetchErr) return { error: fetchErr.message }

  const { error } = await supabase.from('option_pools').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${existing.company_id}`)
  return { error: null }
}

export async function deleteOptionPool(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('option_pools').select('company_id').eq('id', id).single()
  if (fetchErr) return { error: fetchErr.message }

  const { error } = await supabase.from('option_pools').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${existing.company_id}`)
  return { error: null }
}
