import { createServerSupabaseClient } from '@/lib/supabase-server'
import AnalyticsClient from './AnalyticsClient'
import {
  calcCurrentValue,
  calcMOIC,
  calcTVPI,
  calcXIRR,
  calcDPI,
  calcCombinedOwnershipPct,
  getLatestRound,
  totalInvestedInCompany,
  type CashFlow,
} from '@/lib/calculations'
import type { Company, Round, Investment, CapTableEntry, Reserve, LegalEntity } from '@/lib/types'
import { FULL_LIST_FETCH_LIMIT } from '@/lib/limits'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Analytics | Portfolio',
  description: 'Portfolio analytics and performance metrics',
}

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  const [
    { data: companies },
    { data: rounds },
    { data: investments },
    { data: capTable },
    { data: reserves },
    { data: legalEntities },
  ] = await Promise.all([
    supabase.from('companies').select('*').order('name').limit(FULL_LIST_FETCH_LIMIT),
    supabase.from('rounds').select('*').limit(FULL_LIST_FETCH_LIMIT),
    supabase.from('investments').select('*').order('date').limit(FULL_LIST_FETCH_LIMIT),
    supabase.from('cap_table').select('*').limit(FULL_LIST_FETCH_LIMIT),
    supabase.from('reserves').select('*').limit(FULL_LIST_FETCH_LIMIT),
    supabase.from('legal_entities').select('*').order('created_at', { ascending: true }).limit(FULL_LIST_FETCH_LIMIT),
  ])

  const companiesList   = (companies   ?? []) as Company[]
  const roundsList      = (rounds      ?? []) as Round[]
  const investmentsList = (investments ?? []) as Investment[]
  const capTableList      = (capTable      ?? []) as CapTableEntry[]
  const reservesList      = (reserves      ?? []) as Reserve[]
  const legalEntitiesList = (legalEntities ?? []) as LegalEntity[]

  // Compute per-company metrics (same logic as dashboard)
  const companiesWithMetrics = companiesList.map(co => {
    const coInvestments = investmentsList.filter(i => i.company_id === co.id)
    const coRounds      = roundsList.filter(r => r.company_id === co.id)
    const coCapTable    = capTableList.filter(c => c.company_id === co.id)

    const invested     = totalInvestedInCompany(coInvestments)
    const latestRound  = getLatestRound(coRounds)
    const ownershipPct = calcCombinedOwnershipPct(coCapTable, legalEntitiesList)
    const currentValue = latestRound ? calcCurrentValue(ownershipPct, latestRound.post_money) : 0
    const moic         = calcMOIC(currentValue, invested)

    return {
      ...co,
      totalInvested:  invested,
      currentValue,
      moic,
      ownershipPct,
    }
  })

  // Portfolio-level IRR
  const xirrFlows: CashFlow[] = [
    ...investmentsList
      .filter(i => i.amount > 0 && i.date)
      .map(i => ({ amount: -i.amount, date: new Date(i.date) })),
    ...(() => {
      const totalValue = companiesWithMetrics.reduce((s, c) => s + c.currentValue, 0)
      return totalValue > 0 ? [{ amount: totalValue, date: new Date() }] : []
    })(),
  ]
  const irr = calcXIRR(xirrFlows) ?? 0
  const dpi = calcDPI(0, companiesWithMetrics.reduce((s, c) => s + c.totalInvested, 0))

  return (
    <div className="px-8 py-8">
      <AnalyticsClient
        companies={companiesWithMetrics}
        investments={investmentsList}
        portfolioIrr={irr}
        portfolioDpi={dpi}
      />
    </div>
  )
}
