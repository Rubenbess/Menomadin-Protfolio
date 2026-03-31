import { createServerSupabaseClient } from '@/lib/supabase-server'
import CompaniesClient from './CompaniesClient'
import { calcHealthScore } from '@/lib/calculations'
import type { Company, Contact, CompanyKPI, CompanyUpdate, Investment, Round, CapTableEntry, HealthScore } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ strategy?: string }>
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { strategy } = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase.from('companies').select('*').order('name')
  if (strategy) query = query.eq('strategy', strategy)
  const { data: companies } = await query

  const ids = (companies ?? []).map((c: Company) => c.id)

  const [
    { data: contacts },
    { data: kpis },
    { data: updates },
    { data: investments },
    { data: rounds },
    { data: capTable },
  ] = await (ids.length
    ? Promise.all([
        supabase.from('contacts').select('*').in('company_id', ids),
        supabase.from('company_kpis').select('*').in('company_id', ids),
        supabase.from('company_updates').select('*').in('company_id', ids),
        supabase.from('investments').select('*').in('company_id', ids),
        supabase.from('rounds').select('*').in('company_id', ids),
        supabase.from('cap_table').select('*').in('company_id', ids),
      ])
    : Promise.resolve([
        { data: [] }, { data: [] }, { data: [] },
        { data: [] }, { data: [] }, { data: [] },
      ]))

  const today = new Date()
  const healthScores: Record<string, HealthScore> = {}
  for (const co of (companies ?? []) as Company[]) {
    const coKpis    = (kpis        ?? []).filter((k: CompanyKPI)       => k.company_id === co.id) as CompanyKPI[]
    const coUpdates = (updates     ?? []).filter((u: CompanyUpdate)    => u.company_id === co.id) as CompanyUpdate[]
    const coInvest  = (investments ?? []).filter((i: Investment)       => i.company_id === co.id) as Investment[]
    const coRounds  = (rounds      ?? []).filter((r: Round)            => r.company_id === co.id) as Round[]
    const coCap     = (capTable    ?? []).filter((c: CapTableEntry)    => c.company_id === co.id) as CapTableEntry[]
    healthScores[co.id] = calcHealthScore(coKpis, coUpdates, coInvest, coRounds, coCap, today)
  }

  return (
    <CompaniesClient
      companies={(companies ?? []) as Company[]}
      contacts={(contacts ?? []) as Contact[]}
      healthScores={healthScores}
      strategyLabel={null}
    />
  )
}
