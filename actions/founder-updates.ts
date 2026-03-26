'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

interface FounderUpdateData {
  company_id: string
  date: string
  highlights: string | null
  challenges: string | null
  next_quarter: string | null
  ask: string | null
  arr: number | null
  revenue: number | null
  burn_rate: number | null
  cash_runway: number | null
  headcount: number | null
  notes: string | null
}

export async function submitFounderUpdate(data: FounderUpdateData) {
  // Use service role for public form (no auth session)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Build update note from structured fields
  const noteLines = [
    data.highlights && `**Highlights**\n${data.highlights}`,
    data.challenges && `**Challenges**\n${data.challenges}`,
    data.next_quarter && `**Next Quarter**\n${data.next_quarter}`,
    data.ask && `**Ask**\n${data.ask}`,
    data.notes,
  ].filter(Boolean)

  // Insert company update
  const { error: updateError } = await supabase.from('company_updates').insert({
    company_id: data.company_id,
    date: data.date,
    category: 'Founder Update',
    title: `Founder Update — ${new Date(data.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    notes: noteLines.join('\n\n') || null,
  })

  if (updateError) return { error: updateError.message }

  // Insert KPI snapshot if any metrics provided
  const hasMetrics = [data.arr, data.revenue, data.burn_rate, data.cash_runway, data.headcount].some(v => v != null)
  if (hasMetrics) {
    await supabase.from('company_kpis').insert({
      company_id: data.company_id,
      date: data.date,
      arr: data.arr,
      revenue: data.revenue,
      burn_rate: data.burn_rate,
      cash_runway: data.cash_runway,
      headcount: data.headcount,
    })
  }

  revalidatePath(`/companies/${data.company_id}`)
  return { error: null }
}

export async function generateUpdateToken(companyId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const token = crypto.randomUUID()
  const { error } = await supabase
    .from('companies')
    .update({ update_token: token })
    .eq('id', companyId)
  if (error) return { error: error.message, token: null }
  revalidatePath(`/companies/${companyId}`)
  return { error: null, token }
}
