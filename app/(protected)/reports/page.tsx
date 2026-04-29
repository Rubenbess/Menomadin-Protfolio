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
  ] = await Promise.all([
    supabase.from('companies').select('*').order('name'),
    supabase.from('rounds').select('*').order('date', { ascending: false }),
    supabase.from('investments').select('*').order('date', { ascending: false }),
    supabase.from('cap_table').select('*'),
    supabase.from('deal_reports').select('id, report_date, content, created_at').order('report_date', { ascending: false }),
  ])

  // Fetched separately so a missing table never crashes the whole page
  const { data: recipients } = await supabase
    .from('deal_report_recipients')
    .select('id, email, name')
    .order('created_at', { ascending: true })

  const companiesList    = (companies   ?? []) as Company[]
  const roundsList       = (rounds      ?? []) as Round[]
  const investmentsList  = (investments ?? []) as Investment[]
  const capTableList     = (capTable    ?? []) as CapTableEntry[]
  const dealReportsList  = (dealReports ?? []) as DealReport[]
  const recipientsList   = (recipients  ?? []) as DealReportRecipient[]

  // Pre-group by company_id so the per-company loop is O(n) instead of
  // O(n × m) — three full filters per company across investments, rounds,
  // and cap_table on each render.
  const investmentsByCompany = new Map<string, Investment[]>()
  for (const inv of investmentsList) {
    const arr = investmentsByCompany.get(inv.company_id) ?? []
    arr.push(inv)
    investmentsByCompany.set(inv.company_id, arr)
  }
  const roundsByCompany = new Map<string, Round[]>()
  for (const r of roundsList) {
    const arr = roundsByCompany.get(r.company_id) ?? []
    arr.push(r)
    roundsByCompany.set(r.company_id, arr)
  }
  const capTableByCompany = new Map<string, CapTableEntry[]>()
  for (const c of capTableList) {
    const arr = capTableByCompany.get(c.company_id) ?? []
    arr.push(c)
    capTableByCompany.set(c.company_id, arr)
  }

  const companiesWithMetrics = companiesList.map(co => {
    const coInvestments = investmentsByCompany.get(co.id) ?? []
    const coRounds      = roundsByCompany.get(co.id) ?? []
    const coCapTable    = capTableByCompany.get(co.id) ?? []
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
