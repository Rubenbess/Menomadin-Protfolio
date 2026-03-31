import { createServerSupabaseClient } from '@/lib/supabase-server'
import KPIOverviewClient from './KPIOverviewClient'
import type { CompanyKPI } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PortfolioKPIsPage() {
  const supabase = await createServerSupabaseClient()

  const [companiesRes, kpisRes] = await Promise.all([
    supabase.from('companies').select('id, name, sector, strategy, status, logo_url').order('name'),
    supabase.from('company_kpis').select('*').order('date', { ascending: true }),
  ])

  const companies = companiesRes.data ?? []
  const allKpis   = (kpisRes.data ?? []) as CompanyKPI[]

  // All KPIs per company (sorted ascending by date — for sparklines)
  const kpisByCompany: Record<string, CompanyKPI[]> = {}
  for (const kpi of allKpis) {
    if (!kpisByCompany[kpi.company_id]) kpisByCompany[kpi.company_id] = []
    kpisByCompany[kpi.company_id].push(kpi)
  }

  // Latest KPI per company
  const latestKPIs: Record<string, CompanyKPI> = {}
  for (const [coId, kpis] of Object.entries(kpisByCompany)) {
    latestKPIs[coId] = kpis[kpis.length - 1]
  }

  return (
    <KPIOverviewClient
      companies={companies}
      kpisByCompany={kpisByCompany}
      latestKPIs={latestKPIs}
    />
  )
}
