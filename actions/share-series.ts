'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { ShareSeries } from '@/lib/types'

type ShareSeriesData = Omit<ShareSeries, 'id' | 'created_at'>

export async function createShareSeries(data: ShareSeriesData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('share_series').insert(data)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${data.company_id}`)
  return { error: null }
}

export async function updateShareSeries(id: string, data: Partial<ShareSeriesData>) {
  const supabase = await createServerSupabaseClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('share_series').select('company_id').eq('id', id).single()
  if (fetchErr) return { error: fetchErr.message }

  const { error } = await supabase.from('share_series').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${existing.company_id}`)
  return { error: null }
}

export async function deleteShareSeries(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('share_series').select('company_id').eq('id', id).single()
  if (fetchErr) return { error: fetchErr.message }

  const { error } = await supabase.from('share_series').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/companies/${existing.company_id}`)
  return { error: null }
}
