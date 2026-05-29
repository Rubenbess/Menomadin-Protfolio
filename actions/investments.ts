'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { clampText, isInvalidMetric } from '@/lib/validation'

interface InvestmentInput {
  date: string
  amount: number
  instrument: string
  valuation_cap: number | null
  legal_entity: string | null
  notes: string | null
}

interface CreateInvestmentInput extends InvestmentInput {
  company_id: string
  round_id: string | null
}

function validateAmounts(data: InvestmentInput): string | null {
  if (isInvalidMetric(data.amount)) return 'Investment amount must be a finite, non-negative number.'
  if (isInvalidMetric(data.valuation_cap)) return 'Valuation cap must be a finite, non-negative number.'
  return null
}

export async function createInvestment(data: CreateInvestmentInput) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validationErr = validateAmounts(data)
  if (validationErr) return { error: validationErr }

  const { error } = await supabase.from('investments').insert({
    ...data,
    notes: clampText(data.notes),
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateInvestment(id: string, data: InvestmentInput) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validationErr = validateAmounts(data)
  if (validationErr) return { error: validationErr }

  const { error } = await supabase.from('investments').update({
    ...data,
    notes: clampText(data.notes),
  }).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteInvestment(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('investments').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
