import { Breadcrumbs } from '@/components/Breadcrumbs'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { BarChart3 } from 'lucide-react'
import AnalyticsClient from './AnalyticsClient'
import {
  calcCurrentValue,
  calcMOIC,
  getFundOwnershipPct,
  getLatestRound,
  totalInvestedInCompany,
} from '@/lib/calculations'
import type { Company, Round, Investment, CapTableEntry, Reserve } from '@/lib/types'

export const metadata = {
  title: 'Analytics | Portfolio',
  description: 'Portfolio analytics and performance metrics',
}

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  const [companiesResult, investmentsResult, roundsResult, capTableResult, reservesResult] = await Promise.all([
    supabase.from('companies').select('*'),
    supabase.from('investments').select('*').order('date'),
    supabase.from('rounds').select('*'),
    supabase.from('cap_table').select('*'),
    supabase.from('reserves').select('*'),
  ])

  const companiesList   = (companiesResult.data  || []) as Company[]
  const investmentsList = (investmentsResult.data || []) as Investment[]
  const roundsList      = (roundsResult.data      || []) as Round[]
  const capTableList    = (capTableResult.data    || []) as CapTableEntry[]
  const reservesList    = (reservesResult.data    || []) as Reserve[]

  // Enrich each company with computed metrics (same logic as dashboard)
  const companies = companiesList.map((co) => {
    const coInvestments = investmentsList.filter((i) => i.company_id === co.id)
    const coRounds      = roundsList.filter((r) => r.company_id === co.id)
    const coCapTable    = capTableList.filter((c) => c.company_id === co.id)
    const coReserve     = reservesList.find((r) => r.company_id === co.id)

    const totalInvested   = totalInvestedInCompany(coInvestments)
    const latestRound     = getLatestRound(coRounds)
    const ownershipPct    = getFundOwnershipPct(coCapTable)
    const currentValue    = latestRound ? calcCurrentValue(ownershipPct, latestRound.post_money) : 0
    const moic            = calcMOIC(currentValue, totalInvested)
    const plannedReserves  = coReserve?.reserved_amount ?? 0
    const deployedReserves = coReserve?.deployed_amount ?? 0

    return { ...co, totalInvested, currentValue, moic, ownershipPct, plannedReserves, deployedReserves }
  })

  const investments = investmentsList

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Analytics', href: '/analytics' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-amber-700 dark:text-amber-600" size={24} />
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              Analytics
            </h1>
          </div>
          <p className="text-neutral-700 dark:text-neutral-500">
            Portfolio performance and investment metrics
          </p>
        </div>
      </div>

      <Breadcrumbs items={breadcrumbs} />

      <AnalyticsClient companies={companies} investments={investments} />
    </div>
  )
}
