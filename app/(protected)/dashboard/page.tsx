import { createServerSupabaseClient } from '@/lib/supabase-server'
import Badge from '@/components/ui/Badge'
import DashboardCharts from '@/components/DashboardCharts'
import DashboardMetricCard from '@/components/ui/DashboardMetricCard'
import ExportPortfolioCSV from '@/components/ExportPortfolioCSV'
import {
  calcCurrentValue,
  calcMOIC,
  calcTVPI,
  calcXIRR,
  calcDPI,
  calcCombinedOwnershipPct,
  getLatestRound,
  totalInvestedInCompany,
  fmt$$,
  fmtMultiple,
  fmtPct,
  type CashFlow,
} from '@/lib/calculations'
import type { Company, Round, Investment, CapTableEntry, Reserve, CompanyWithMetrics, Safe, LegalEntity } from '@/lib/types'
import { DollarSign, TrendingUp, BarChart2, Activity, Percent, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import StrategyTableFilter from '@/components/StrategyTableFilter'
import PortfolioTable from '@/components/PortfolioTable'
import { fundLabel } from '@/lib/funds'
import { TOP_COMPANIES_FOR_SPARKLINE } from '@/lib/limits'

function groupBy<T>(items: T[], key: (t: T) => string | null): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const it of items) {
    const k = key(it)
    if (!k) continue
    const arr = m.get(k)
    if (arr) arr.push(it); else m.set(k, [it])
  }
  return m
}

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ strategy?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { strategy } = await searchParams
  const supabase = await createServerSupabaseClient()

  let companiesQuery = supabase.from('companies').select('*').order('name')
  if (strategy) companiesQuery = companiesQuery.eq('strategy', strategy)

  const [
    { data: companies },
    { data: rounds },
    { data: investments },
    { data: capTable },
    { data: reserves },
    { data: safes },
    { data: legalEntities },
  ] = await Promise.all([
    companiesQuery,
    supabase.from('rounds').select('*'),
    supabase.from('investments').select('*').order('date'),
    supabase.from('cap_table').select('*'),
    supabase.from('reserves').select('*'),
    supabase.from('safes').select('*').order('date'),
    supabase.from('legal_entities').select('*').order('created_at', { ascending: true }),
  ])

  const companiesList     = (companies     ?? []) as Company[]
  const roundsList        = (rounds        ?? []) as Round[]
  const investmentsList   = (investments   ?? []) as Investment[]
  const capTableList      = (capTable      ?? []) as CapTableEntry[]
  const reservesList      = (reserves      ?? []) as Reserve[]
  const safesList         = (safes         ?? []) as Safe[]
  const legalEntitiesList = (legalEntities ?? []) as LegalEntity[]

  // Pre-group sibling tables by company_id once (O(n)) so the per-company loop
  // doesn't re-scan each list (was O(n²) — see daily health check report).
  const investmentsByCompany = groupBy(investmentsList, i => i.company_id)
  const roundsByCompany      = groupBy(roundsList,      r => r.company_id)
  const capTableByCompany    = groupBy(capTableList,    c => c.company_id)
  const reservesByCompany    = new Map(reservesList.map(r => [r.company_id, r]))

  const companiesWithMetrics: CompanyWithMetrics[] = companiesList.map((co) => {
    const coInvestments = investmentsByCompany.get(co.id) ?? []
    const coRounds      = roundsByCompany.get(co.id)      ?? []
    const coCapTable    = capTableByCompany.get(co.id)    ?? []
    const coReserve     = reservesByCompany.get(co.id)

    const totalInvested    = totalInvestedInCompany(coInvestments)
    const latestRound      = getLatestRound(coRounds)
    const ownershipPct     = calcCombinedOwnershipPct(coCapTable, legalEntitiesList)
    const currentValue     = latestRound ? calcCurrentValue(ownershipPct, latestRound.post_money) : 0
    const moic             = calcMOIC(currentValue, totalInvested)
    const plannedReserves  = coReserve?.reserved_amount  ?? 0
    const deployedReserves = coReserve?.deployed_amount  ?? 0
    const initialInvestment = coInvestments[0]?.amount   ?? 0

    return { ...co, totalInvested, currentValue, moic, ownershipPct, plannedReserves, deployedReserves, initialInvestment }
  })

  const totalInvested     = companiesWithMetrics.reduce((s, c) => s + c.totalInvested, 0)
  const totalCurrentValue = companiesWithMetrics.reduce((s, c) => s + c.currentValue, 0)
  const tvpi              = calcTVPI(totalCurrentValue, totalInvested)
  const moic              = calcMOIC(totalCurrentValue, totalInvested)

  const xirrFlows: CashFlow[] = [
    ...investmentsList
      .filter(i => i.amount > 0 && i.date)
      .map(i => ({ amount: -i.amount, date: new Date(i.date) })),
    ...(totalCurrentValue > 0
      ? [{ amount: totalCurrentValue, date: new Date() }]
      : []),
  ]
  const irr = calcXIRR(xirrFlows)
  const dpi = calcDPI(0, totalInvested)

  // ── Sparkline data for metric cards ──────────────────────────────────────────

  // Companies sorted ascending (small → large) for a "growth trend" look
  const byInvested = [...companiesWithMetrics]
    .filter(c => c.totalInvested > 0)
    .sort((a, b) => a.totalInvested - b.totalInvested)
    .slice(-TOP_COMPANIES_FOR_SPARKLINE)

  const byValue = [...companiesWithMetrics]
    .filter(c => c.currentValue > 0)
    .sort((a, b) => a.currentValue - b.currentValue)
    .slice(-TOP_COMPANIES_FOR_SPARKLINE)

  const byMoic = [...companiesWithMetrics]
    .filter(c => c.moic > 0)
    .sort((a, b) => a.moic - b.moic)
    .slice(-TOP_COMPANIES_FOR_SPARKLINE)

  // Monthly deployment over last 8 months (for IRR sparkline)
  const now = new Date()
  const monthlyDeployments = Array.from({ length: 8 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1)
    const monthEnd   = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    return investmentsList
      .filter(inv => {
        const d = new Date(inv.date)
        return d >= monthStart && d < monthEnd
      })
      .reduce((sum, inv) => sum + inv.amount, 0)
  })

  const investedChartData = byInvested.map(c => c.totalInvested)
  const valueChartData    = byValue.map(c => c.currentValue)
  const moicChartData     = byMoic.map(c => c.moic)
  const irrChartData      = monthlyDeployments
  const tvpiChartData     = moicChartData
  const dpiChartData      = investedChartData

  // ── For Export CSV ────────────────────────────────────────────────────────────

  const exportRows = companiesWithMetrics.map(c => ({
    name:          c.name,
    strategy:      c.strategy,
    status:        c.status,
    sector:        c.sector ?? '',
    totalInvested: c.totalInvested,
    currentValue:  c.currentValue,
    moic:          c.moic,
    ownershipPct:  c.ownershipPct,
  }))

  // ── Misc ──────────────────────────────────────────────────────────────────────

  const strategyLabel = strategy ? fundLabel(strategy as 'impact' | 'venture') : 'All Strategies'

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="animate-fade-in">

      {/* ── Welcome header ──────────────────────────────────────────────── */}
      <div className="px-8 pt-8 pb-6 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
              Welcome back 👋
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{strategyLabel}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium hidden sm:block">
              {today}
            </span>
            <ExportPortfolioCSV companies={exportRows} />
          </div>
        </div>
      </div>

      {/* ── Metric cards ────────────────────────────────────────────────── */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <DashboardMetricCard
            label="Total Invested"
            value={fmt$$(totalInvested)}
            sub={`${companiesWithMetrics.length} companies`}
            chartData={investedChartData}
            accentColor="#6366f1"
            icon={<DollarSign size={15} color="#6366f1" />}
          />
          <DashboardMetricCard
            label="Portfolio Value"
            value={fmt$$(totalCurrentValue)}
            sub={`vs ${fmt$$(totalInvested)} deployed`}
            chartData={valueChartData}
            accentColor="#10b981"
            icon={<TrendingUp size={15} color="#10b981" />}
          />
          <DashboardMetricCard
            label="TVPI"
            value={fmtMultiple(tvpi)}
            sub="Total value / paid-in"
            chartData={tvpiChartData}
            accentColor="#3b82f6"
            icon={<BarChart2 size={15} color="#3b82f6" />}
          />
          <DashboardMetricCard
            label="MOIC"
            value={fmtMultiple(moic)}
            sub="Return multiple"
            chartData={moicChartData}
            accentColor="#f59e0b"
            icon={<Activity size={15} color="#f59e0b" />}
          />
          <DashboardMetricCard
            label="IRR"
            value={irr != null ? `${(irr * 100).toFixed(1)}%` : 'N/A'}
            sub="Internal rate of return"
            chartData={irrChartData}
            accentColor="#8b5cf6"
            icon={<Percent size={15} color="#8b5cf6" />}
          />
          <DashboardMetricCard
            label="DPI"
            value={fmtMultiple(dpi)}
            sub="Distributions / paid-in"
            chartData={dpiChartData}
            accentColor="#14b8a6"
            icon={<ArrowUpRight size={15} color="#14b8a6" />}
          />
        </div>
      </div>

      {/* ── Strategy breakdown ───────────────────────────────────────────── */}
      {!strategy && (() => {
        const impactCos       = companiesWithMetrics.filter(c => c.strategy === 'impact')
        const ventureCos      = companiesWithMetrics.filter(c => c.strategy === 'venture')
        const impactInvested  = impactCos.reduce((s, c)  => s + c.totalInvested, 0)
        const ventureInvested = ventureCos.reduce((s, c) => s + c.totalInvested, 0)
        const impactValue     = impactCos.reduce((s, c)  => s + c.currentValue, 0)
        const ventureValue    = ventureCos.reduce((s, c) => s + c.currentValue, 0)

        return (
          <div className="px-8 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50/40 dark:bg-emerald-900/10 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{fundLabel('impact')}</span>
                  <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">{impactCos.length} companies</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Invested</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mt-2">{fmt$$(impactInvested)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Value</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mt-2">{fmt$$(impactValue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">MOIC</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-2">{fmtMultiple(calcMOIC(impactValue, impactInvested))}</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50/40 dark:bg-blue-900/10 rounded-xl border border-blue-200/60 dark:border-blue-800/40 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{fundLabel('venture')}</span>
                  <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">{ventureCos.length} companies</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Invested</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mt-2">{fmt$$(ventureInvested)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Value</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mt-2">{fmt$$(ventureValue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">MOIC</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">{fmtMultiple(calcMOIC(ventureValue, ventureInvested))}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Portfolio table ──────────────────────────────────────────────── */}
      <div className="px-8 mb-6">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Portfolio Companies</h2>
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 rounded-full px-3 py-1">
                {companiesWithMetrics.length}
              </span>
            </div>
            <Suspense fallback={null}>
              <StrategyTableFilter />
            </Suspense>
          </div>

          {companiesWithMetrics.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">No companies found.</p>
              <Link href="/companies" className="inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
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
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <div className="px-8 pb-8">
        <DashboardCharts companies={companiesWithMetrics} />
      </div>
    </div>
  )
}
