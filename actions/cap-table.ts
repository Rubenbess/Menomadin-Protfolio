'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isInvalidMetric } from '@/lib/validation'

export async function createCapTableEntry(data: {
  company_id: string
  round_id: string | null
  shareholder_name: string
  ownership_percentage: number
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // ownership_percentage feeds the LP-report Ownership column and all downstream
  // MOIC/FMV math — reject non-finite, negative, or >100% values before they persist.
  if (isInvalidMetric(data.ownership_percentage) || data.ownership_percentage > 100) {
    return { error: 'Ownership percentage must be a finite number between 0 and 100.' }
  }

  const { error } = await supabase.from('cap_table').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteCapTableEntry(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('cap_table').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
