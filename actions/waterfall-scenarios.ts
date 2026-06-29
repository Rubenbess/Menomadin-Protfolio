'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { clampText, isInvalidMetric } from '@/lib/validation'

export async function createWaterfallScenario(data: {
  company_id: string
  name: string
  exit_value: number
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // exit_value is the denominator/driver of the entire liquidation waterfall —
  // a non-finite or negative value corrupts every holder's proceeds.
  if (isInvalidMetric(data.exit_value)) {
    return { error: 'Exit value must be a finite, non-negative number.' }
  }

  const { error } = await supabase
    .from('waterfall_scenarios')
    .insert({ ...data, name: clampText(data.name) })
  if (error) return { error: error.message }
  revalidatePath(`/companies/${data.company_id}`)
  return { error: null }
}

export async function deleteWaterfallScenario(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing, error: fetchErr } = await supabase
    .from('waterfall_scenarios').select('company_id').eq('id', id).single()
  if (fetchErr || !existing) return { error: fetchErr?.message ?? 'Scenario not found' }

  const { error } = await supabase.from('waterfall_scenarios').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${existing.company_id}`)
  return { error: null }
}
