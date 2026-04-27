import { createServerSupabaseClient } from '@/lib/supabase-server'
import ReportsClient from './ReportsClient'
import type { Company, Round, Investment, CapTableEntry } from '@/lib/types'
import {
  calcCurrentValue, calcMOIC, getFundOwnershipPct,
  getLatestRound, totalInvestedInCompany,
} from '@/lib/calculations'

export const dynamic = 'force-dynamic'

export interface DealReport {
  id: string
  report_date: string
  content: string
  created_at: string
}

export interface DealReportRecipient {
  id: string
  email: string
  name: string | null
}

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient()

  const [
    { data: companies },
    { data: rounds },
    { data: investments },
    { data: capTable },
    { data: dealReports },
    { data: recipients },
  ] = await Promise.all([
    supabase.from('companies').select('*').order('name'),
    supabase.from('rounds').select('*').order('date', { ascending: false }),
    supabase.from('investments').select('*').order('date', { ascending: false }),
    supabase.from('cap_table').select('*'),
    supabase.from('deal_reports').select('id, report_date, content, created_at').order('report_date', { ascending: false }),
    supabase.from('deal_report_recipients').select('id, email, name').order('created_at', { ascending: true }),
  ])

  const companiesList    = (companies   ?? []) as Company[]
  const roundsList       = (rounds      ?? []) as Round[]
  const investmentsList  = (investments ?? []) as Investment[]
  const capTableList     = (capTable    ?? []) as CapTableEntry[]
  const dealReportsList  = (dealReports ?? []) as DealReport[]
  const recipientsList   = (recipients  ?? []) as DealReportRecipient[]

  // Build companies with metrics for reports
  const companiesWithMetrics = companiesList.map(co => {
    const coInvestments = investmentsList.filter(i => i.company_id === co.id)
    const coRounds      = roundsList.filter(r => r.company_id === co.id)
    const coCapTable    = capTableList.filter(c => c.company_id === co.id)
    const totalInvested = totalInvestedInCompany(coInvestments)
    const latestRound   = getLatestRound(coRounds)
    const ownershipPct  = getFundOwnershipPct(coCapTable)
    const currentValue  = latestRound ? calcCurrentValue(ownershipPct, latestRound.post_money) : 0
    const moic          = calcMOIC(currentValue, totalInvested)
    return { ...co, totalInvested, currentValue, moic, ownershipPct }
  })

  return (
    <ReportsClient
      companies={companiesWithMetrics}
      rounds={roundsList}
      investments={investmentsList}
      capTable={capTableList}
      dealReports={dealReportsList}
      recipients={recipientsList}
    />
  )
}
