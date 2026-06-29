'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { clampText, isInvalidMetric } from '@/lib/validation'

export async function createKPI(data: {
  company_id: string
  date: string
  revenue: number | null
  arr: number | null
  run_rate: number | null
  burn_rate: number | null
  cash_runway: number | null
  headcount: number | null
  gross_margin: number | null
  notes: string | null
  custom_kpis: Record<string, string> | null
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // KPI figures cascade into revenue/ARR charts and valuation math. Burn and
  // run-rate can legitimately be negative; the rest cannot. Reject non-finite /
  // out-of-range values before they corrupt downstream aggregates.
  if (
    isInvalidMetric(data.revenue) ||
    isInvalidMetric(data.arr) ||
    isInvalidMetric(data.run_rate) ||
    isInvalidMetric(data.burn_rate, true) ||
    isInvalidMetric(data.cash_runway) ||
    isInvalidMetric(data.headcount) ||
    isInvalidMetric(data.gross_margin)
  ) {
    return { error: 'KPI values must be finite numbers within valid bounds.' }
  }

  const { error } = await supabase
    .from('company_kpis')
    .insert({ ...data, notes: clampText(data.notes) })
  return { error: error?.message ?? null }
}

export async function deleteKPI(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('company_kpis').delete().eq('id', id)
  return { error: error?.message ?? null }
}
