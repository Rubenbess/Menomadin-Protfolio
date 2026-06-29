'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { isInvalidMetric } from '@/lib/validation'
import type { ShareSeries } from '@/lib/types'

type ShareSeriesData = Omit<ShareSeries, 'id' | 'created_at'>

/**
 * Every numeric field here feeds buildWaterfallHolders / calcWaterfall, where a
 * NaN/Infinity/negative share count, price, or multiple silently corrupts the
 * proceeds distribution. Reject impossible values before they persist — mirrors
 * the guards already applied to cap-table, kpis, reserves, and waterfall-scenarios.
 * (Closes the share-series half of M-012.)
 */
function invalidShareSeries(data: Partial<ShareSeriesData>): boolean {
  return (
    isInvalidMetric(data.shares) ||
    isInvalidMetric(data.price_per_share) ||
    isInvalidMetric(data.invested_amount) ||
    isInvalidMetric(data.liquidation_pref_mult) ||
    isInvalidMetric(data.liquidation_seniority) ||
    isInvalidMetric(data.participation_cap_mult) ||
    isInvalidMetric(data.conversion_ratio)
  )
}

export async function createShareSeries(data: ShareSeriesData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (invalidShareSeries(data)) {
    return { error: 'Share series values must be finite, non-negative numbers.' }
  }
  const { error } = await supabase.from('share_series').insert(data)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${data.company_id}`)
  return { error: null }
}

export async function updateShareSeries(id: string, data: Partial<ShareSeriesData>) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (invalidShareSeries(data)) {
    return { error: 'Share series values must be finite, non-negative numbers.' }
  }
  const { data: existing, error: fetchErr } = await supabase
    .from('share_series').select('company_id').eq('id', id).single()
  if (fetchErr || !existing) return { error: fetchErr?.message ?? 'Share series not found' }

  const { error } = await supabase.from('share_series').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${existing.company_id}`)
  return { error: null }
}

export async function deleteShareSeries(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: existing, error: fetchErr } = await supabase
    .from('share_series').select('company_id').eq('id', id).single()
  if (fetchErr || !existing) return { error: fetchErr?.message ?? 'Share series not found' }

  const { error } = await supabase.from('share_series').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${existing.company_id}`)
  return { error: null }
}
