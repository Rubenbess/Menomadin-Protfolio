import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MetricCard } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import DashboardCharts from '@/components/DashboardCharts'
import {
  calcCurrentValue,
  calcMOIC,
  calcTVPI,
  calcXIRR,
  calcDPI,
  getFundOwnershipPct,
  getLatestRound,
  totalInvestedInCompany,
  fmt$$,
  fmtMultiple,
  fmtPct,
  type CashFlow,
} from '@/lib/calculations'
import type { Company, Round, Investment, CapTableEntry, Reserve, CompanyWithMetrics, Safe } from '@/lib/types'
import Link from 'next/link'
import { Suspense } from 'react'
import StrategyTableFilter from '@/components/StrategyTableFilter'
import PortfolioTable from '@/components/PortfolioTable'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ strategy?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { strategy } = await searchParams
  const supabase = await createServerSupabaseClient()

  let companiesQuery = supabase.from('companies').select('*').order('name')
  if (strategy) companiesQuery = companiesQuery.eq('strategy', strategy)

  const [{ data: companies }, { data: rounds }, { data: investments }, { data: capTable }, { data: reserves }, { data: safes }] =
    await Promise.all([
      companiesQuery,
      supabase.from('rounds').select('*'),
      supabase.from('investments').select('*').order('date'),
      supabase.from('cap_table').select('*'),
      supabase.from('reserves').select('*'),
      supabase.from('safes').select('*').order('date'),
    ])

  const companiesList   = (companies   ?? []) as Company[]
  const roundsList      = (rounds      ?? []) as Round[]
  const investmentsList = (investments ?? []) as Investment[]
  const capTableList    = (capTable    ?? []) as CapTableEntry[]
  const reservesList    = (reserves    ?? []) as Reserve[]
  const safesList       = (safes       ?? []) as Safe[]

  const companiesWithMetrics: CompanyWithMetrics[] = companiesList.map((co) => {
    const coInvestments = investmentsList.filter((i) => i.company_id === co.id)
    const coRounds      = roundsList.filter((r) => r.company_id === co.id)
    const coCapTable    = capTableList.filter((c) => c.company_id === co.id)
    const coReserve     = reservesList.find((r) => r.company_id === co.id)

    const totalInvested    = totalInvestedInCompany(coInvestments)
    const latestRound      = getLatestRound(coRounds)
    const ownershipPct     = getFundOwnershipPct(coCapTable)
    const currentValue     = latestRound ? calcCurrentValue(ownershipPct, latestRound.post_money) : 0
    const moic             = calcMOIC(currentValue, totalInvested)
    const plannedReserves  = coReserve?.reserved_amount  ?? 0
    const deployedReserves = coReserve?.deployed_amount  ?? 0
    const initialInvestment = coInvestments[0]?.amount   ?? 0

    return { ...co, totalInvested, currentValue, moic, ownershipPct, plannedReserves, deployedReserves, initialInvestment }
  })

  const totalInvested      = companiesWithMetrics.reduce((s, c) => s + c.totalInvested, 0)
  const totalCurrentValue  = companiesWithMetrics.reduce((s, c) => s + c.currentValue, 0)
  const tvpi               = calcTVPI(totalCurrentValue, totalInvested)
  const moic               = calcMOIC(totalCurrentValue, totalInvested)

  // IRR: each investment is a negative cash flow; total current value is positive today
  const xirrFlows: CashFlow[] = [
    ...investmentsList
      .filter(i => i.amount > 0 && i.date)
      .map(i => ({ amount: -i.amount, date: new Date(i.date) })),
    ...(totalCurrentValue > 0
      ? [{ amount: totalCurrentValue, date: new Date() }]
      : []),
  ]
  const irr = calcXIRR(xirrFlows)

  // DPI: no distribution model yet — always 0 for now
  const dpi = calcDPI(0, totalInvested)

  const strategyLabel =
    strategy === 'impact'   ? 'Menomadin Impact'   :
    strategy === 'venture'  ? 'Menomadin Ventures' :
    'All Strategies'

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">{strategyLabel}</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-6 md:mb-8">
        <MetricCard label="Total Invested"    value={fmt$$(totalInvested)}      accent="violet" />
        <MetricCard label="Portfolio Value"   value={fmt$$(totalCurrentValue)}  accent="emerald" />
        <MetricCard label="TVPI"              value={fmtMultiple(tvpi)}         accent="blue" />
        <MetricCard label="MOIC"              value={fmtMultiple(moic)}         accent="amber" />
        <MetricCard label="IRR"               value={irr != null ? `${(irr * 100).toFixed(1)}%` : 'N/A'} accent="violet" />
        <MetricCard label="DPI"               value={fmtMultiple(dpi)} />
      </div>

      {/* Strategy breakdown */}
      {!strategy && (() => {
        const impactCos       = companiesWithMetrics.filter(c => c.strategy === 'impact')
        const ventureCos      = companiesWithMetrics.filter(c => c.strategy === 'venture')
        const impactInvested  = impactCos.reduce((s, c)  => s + c.totalInvested, 0)
        const ventureInvested = ventureCos.reduce((s, c) => s + c.totalInvested, 0)
        const impactValue     = impactCos.reduce((s, c)  => s + c.currentValue,  0)
        const ventureValue    = ventureCos.reduce((s, c) => s + c.currentValue,  0)

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 md:mb-8">
            <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5 border-l-4 border-emerald-500">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-900">Menomadin Impact</span>
                <span className="ml-auto text-xs text-slate-400">{impactCos.length} companies</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Invested</p><p className="text-base font-bold text-slate-900 mt-1">{fmt$$(impactInvested)}</p></div>
                <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Value</p><p className="text-base font-bold text-slate-900 mt-1">{fmt$$(impactValue)}</p></div>
                <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wider">MOIC</p><p className="text-base font-bold text-emerald-600 mt-1">{fmtMultiple(calcMOIC(impactValue, impactInvested))}</p></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-5 border-l-4 border-blue-500">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-900">Menomadin Ventures</span>
                <span className="ml-auto text-xs text-slate-400">{ventureCos.length} companies</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Invested</p><p className="text-base font-bold text-slate-900 mt-1">{fmt$$(ventureInvested)}</p></div>
                <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Value</p><p className="text-base font-bold text-slate-900 mt-1">{fmt$$(ventureValue)}</p></div>
                <div><p className="text-xs font-medium text-slate-400 uppercase tracking-wider">MOIC</p><p className="text-base font-bold text-blue-600 mt-1">{fmtMultiple(calcMOIC(ventureValue, ventureInvested))}</p></div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Portfolio table */}
      <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-slate-900">Portfolio Companies</h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">
              {companiesWithMetrics.length}
            </span>
          </div>
          <Suspense fallback={null}>
            <StrategyTableFilter />
          </Suspense>
        </div>

        {companiesWithMetrics.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-slate-400 mb-4">No companies found.</p>
            <Link href="/companies" className="inline-flex items-center text-sm font-semibold text-violet-600 hover:text-violet-700">
              Add a company →
            </Link>
          </div>
        ) : (
          <PortfolioTable
            companies={companiesWithMetrics}
            investments={investmentsList}
            safes={safesList}
          />
        )}
      </div>

      {/* Charts */}
      <div className="mt-6">
        <DashboardCharts companies={companiesWithMetrics} />
      </div>
    </div>
  )
}
