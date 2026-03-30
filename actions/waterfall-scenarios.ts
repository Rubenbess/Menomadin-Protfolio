'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createWaterfallScenario(data: {
  company_id: string
  name: string
  exit_value: number
}) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('waterfall_scenarios').insert(data)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${data.company_id}`)
  return { error: null }
}

export async function deleteWaterfallScenario(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('waterfall_scenarios').select('company_id').eq('id', id).single()
  if (fetchErr) return { error: fetchErr.message }

  const { error } = await supabase.from('waterfall_scenarios').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${existing.company_id}`)
  return { error: null }
}
