'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface FounderUpdateData {
  token: string
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

/**
 * Maximum byte sizes for free-text fields. The service-role client used below
 * bypasses RLS, so a leaked token would otherwise let any caller insert
 * megabyte-sized strings until the row hit Postgres limits. Values are
 * deliberately generous for normal founder usage.
 */
const MAX_FREE_TEXT_LEN = 5_000

function clampText(s: string | null): string | null {
  if (s == null) return null
  if (s.length <= MAX_FREE_TEXT_LEN) return s
  return s.slice(0, MAX_FREE_TEXT_LEN)
}

/**
 * Reject metric values that are non-finite, negative (where it's never
 * meaningful), or absurdly large. KPI fields write directly into the same
 * `company_kpis` table the team uses for reporting; bad input here corrupts
 * downstream MOIC and runway charts.
 */
function isInvalidMetric(v: number | null, allowNegative = false): boolean {
  if (v == null) return false
  if (!Number.isFinite(v)) return true
  if (!allowNegative && v < 0) return true
  // 1e15 catches accidentally-typed million-billions ($1e15 = $1Q) and
  // most arithmetic-overflow inputs.
  if (Math.abs(v) > 1e15) return true
  return false
}

/**
 * Public founder-update submission. Accepts the per-company `update_token`
 * (NOT a raw company_id from the client) and resolves the company server-side.
 * This is the only authentication on this endpoint, so the token must be
 * treated as a capability — leaking it allows update injection for that
 * single company. Uses the service role to bypass RLS once the token is
 * confirmed; never trust the caller to pass company_id directly.
 */
export async function submitFounderUpdate(data: FounderUpdateData) {
  if (!data.token) return { error: 'Missing token' }

  // Defensive bounds — see helper docs above.
  if (
    isInvalidMetric(data.arr) ||
    isInvalidMetric(data.revenue) ||
    isInvalidMetric(data.burn_rate) ||
    isInvalidMetric(data.cash_runway) ||
    isInvalidMetric(data.headcount)
  ) {
    return { error: 'One or more metric values are out of range.' }
  }

  // Date sanity — must parse, must not be more than a year in the future.
  const parsedDate = data.date ? new Date(data.date) : null
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return { error: 'Invalid date' }
  }
  const oneYearAhead = new Date()
  oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1)
  if (parsedDate.getTime() > oneYearAhead.getTime()) {
    return { error: 'Date cannot be more than a year in the future' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('update_token', data.token)
    .maybeSingle()

  if (!company) return { error: 'Invalid or revoked link' }
  const companyId = company.id as string

  const noteLines = [
    clampText(data.highlights) && `**Highlights**\n${clampText(data.highlights)}`,
    clampText(data.challenges) && `**Challenges**\n${clampText(data.challenges)}`,
    clampText(data.next_quarter) && `**Next Quarter**\n${clampText(data.next_quarter)}`,
    clampText(data.ask) && `**Ask**\n${clampText(data.ask)}`,
    clampText(data.notes),
  ].filter(Boolean)

  const { error: updateError } = await supabase.from('company_updates').insert({
    company_id: companyId,
    date: data.date,
    category: 'Founder Update',
    title: `Founder Update — ${new Date(data.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    notes: noteLines.join('\n\n') || null,
  })

  if (updateError) return { error: updateError.message }

  const hasMetrics = [data.arr, data.revenue, data.burn_rate, data.cash_runway, data.headcount].some(v => v != null)
  if (hasMetrics) {
    const { error: kpiError } = await supabase.from('company_kpis').insert({
      company_id: companyId,
      date: data.date,
      arr: data.arr,
      revenue: data.revenue,
      burn_rate: data.burn_rate,
      cash_runway: data.cash_runway,
      headcount: data.headcount,
    })
    if (kpiError) return { error: kpiError.message }
  }

  revalidatePath(`/companies/${companyId}`)
  return { error: null }
}

/**
 * Rotate (or issue) the per-company `update_token`. This is an authenticated
 * portal-side action — only logged-in team members can call it. The previous
 * implementation used the service role with no session check, which let any
 * caller hitting the action endpoint take over the founder link for any
 * company. Now uses the user-context client so RLS is enforced.
 */
export async function generateUpdateToken(companyId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', token: null }

  const token = crypto.randomUUID()
  const { error } = await supabase
    .from('companies')
    .update({ update_token: token })
    .eq('id', companyId)
  if (error) return { error: error.message, token: null }
  revalidatePath(`/companies/${companyId}`)
  return { error: null, token }
}
