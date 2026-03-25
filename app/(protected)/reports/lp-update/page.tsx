import { createServerSupabaseClient } from '@/lib/supabase-server'
import LPReportClient from './LPReportClient'
import type { Company, Round, Investment, CapTableEntry, CompanyKPI, CompanyUpdate } from '@/lib/types'
import {
  calcCurrentValue,
  calcMOIC,
  calcTVPI,
  calcXIRR,
  getFundOwnershipPct,
  getLatestRound,
  totalInvestedInCompany,
  type CashFlow,
} from '@/lib/calculations'

export const dynamic = 'force-dynamic'

export default async function LPReportPage() {
  const supabase = await createServerSupabaseClient()

  const [
    { data: companies },
    { data: rounds },
    { data: investments },
    { data: capTable },
    { data: updates },
    { data: kpis },
  ] = await Promise.all([
    supabase.from('companies').select('*').order('name'),
    supabase.from('rounds').select('*').order('date', { ascending: false }),
    supabase.from('investments').select('*').order('date', { ascending: false }),
    supabase.from('cap_table').select('*'),
    supabase.from('company_updates').select('*').order('date', { ascending: false }),
    supabase.from('company_kpis').select('*').order('date', { ascending: false }),
  ])

  const companiesList   = (companies   ?? []) as Company[]
  const roundsList      = (rounds      ?? []) as Round[]
  const investmentsList = (investments ?? []) as Investment[]
  const capTableList    = (capTable    ?? []) as CapTableEntry[]
  const updatesList     = (updates     ?? []) as CompanyUpdate[]
  const kpisList        = (kpis        ?? []) as CompanyKPI[]

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

  const totalInvested     = companiesWithMetrics.reduce((s, c) => s + c.totalInvested, 0)
  const totalCurrentValue = companiesWithMetrics.reduce((s, c) => s + c.currentValue,  0)
  const tvpi              = calcTVPI(totalCurrentValue, totalInvested)
  const activeCount       = companiesWithMetrics.filter(c => c.status === 'active').length

  const xirrFlows: CashFlow[] = [
    ...investmentsList
      .filter(i => i.amount > 0 && i.date)
      .map(i => ({ amount: -i.amount, date: new Date(i.date) })),
    ...(totalCurrentValue > 0 ? [{ amount: totalCurrentValue, date: new Date() }] : []),
  ]
  const irr = calcXIRR(xirrFlows)

  // Latest KPI per company
  const latestKpis = companiesList.map(co => {
    const coKpis = kpisList.filter(k => k.company_id === co.id)
    if (!coKpis.length) return null
    const latest = coKpis.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    return { ...latest, companyName: co.name }
  }).filter(Boolean) as (CompanyKPI & { companyName: string })[]

  return (
    <LPReportClient
      companies={companiesWithMetrics}
      updates={updatesList}
      latestKpis={latestKpis}
      totalInvested={totalInvested}
      totalCurrentValue={totalCurrentValue}
      tvpi={tvpi}
      irr={irr}
      activeCount={activeCount}
    />
  )
}
