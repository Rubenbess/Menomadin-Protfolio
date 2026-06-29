'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { clampText, isInvalidMetric } from '@/lib/validation'

interface ReserveData {
  reserved_amount: number
  deployed_amount: number
  target_round: string | null
  notes: string | null
}

export async function upsertReserve(companyId: string, data: ReserveData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Reserve amounts drive follow-on capital planning — reject non-finite/negative.
  if (isInvalidMetric(data.reserved_amount) || isInvalidMetric(data.deployed_amount)) {
    return { error: 'Reserve amounts must be finite, non-negative numbers.' }
  }
  data = { ...data, notes: clampText(data.notes) }

  const { data: existing, error: probeError } = await supabase
    .from('reserves')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle()

  // Surface the probe error rather than silently falling through to the insert
  // branch — otherwise a transient read failure masquerades as a unique-constraint
  // / duplicate error and the real cause is lost.
  if (probeError) return { error: probeError.message }

  if (existing) {
    const { error } = await supabase.from('reserves').update(data).eq('company_id', companyId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('reserves').insert({ company_id: companyId, ...data })
    if (error) return { error: error.message }
  }

  return { error: null }
}

export async function deleteReserve(companyId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('reserves').delete().eq('company_id', companyId)
  if (error) return { error: error.message }
  return { error: null }
}
