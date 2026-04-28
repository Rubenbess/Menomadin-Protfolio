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

  // Pre-group sibling tables by company_id once, instead of running 5 .filter()
  // passes per company (was O(n²)).
  function groupByCompany<T extends { company_id: string }>(rows: T[] | null | undefined): Map<string, T[]> {
    const m = new Map<string, T[]>()
    for (const r of rows ?? []) {
      const arr = m.get(r.company_id)
      if (arr) arr.push(r); else m.set(r.company_id, [r])
    }
    return m
  }
  const kpisByCompany       = groupByCompany((kpis        ?? []) as CompanyKPI[])
  const updatesByCompany    = groupByCompany((updates     ?? []) as CompanyUpdate[])
  const investByCompany     = groupByCompany((investments ?? []) as Investment[])
  const roundsByCompany     = groupByCompany((rounds      ?? []) as Round[])
  const capByCompany        = groupByCompany((capTable    ?? []) as CapTableEntry[])

  const today = new Date()
  const healthScores: Record<string, HealthScore> = {}
  for (const co of (companies ?? []) as Company[]) {
    healthScores[co.id] = calcHealthScore(
      kpisByCompany.get(co.id)    ?? [],
      updatesByCompany.get(co.id) ?? [],
      investByCompany.get(co.id)  ?? [],
      roundsByCompany.get(co.id)  ?? [],
      capByCompany.get(co.id)     ?? [],
      today,
    )
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
