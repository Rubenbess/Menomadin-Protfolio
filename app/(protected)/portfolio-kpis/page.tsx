import { createServerSupabaseClient } from '@/lib/supabase-server'
import KPIOverviewClient from './KPIOverviewClient'

export const dynamic = 'force-dynamic'

export default async function PortfolioKPIsPage() {
  const supabase = await createServerSupabaseClient()

  const [companiesRes, kpisRes] = await Promise.all([
    supabase.from('companies').select('id, name, sector, strategy, status, logo_url').order('name'),
    supabase.from('company_kpis').select('*').order('date', { ascending: false }),
  ])

  const companies = companiesRes.data ?? []
  const kpis = kpisRes.data ?? []

  // Latest KPI per company
  const latestKPIs: Record<string, (typeof kpis)[0]> = {}
  for (const kpi of kpis) {
    if (!latestKPIs[kpi.company_id]) latestKPIs[kpi.company_id] = kpi
  }

  return <KPIOverviewClient companies={companies} latestKPIs={latestKPIs} />
}
