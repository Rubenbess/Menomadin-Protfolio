import { createServerSupabaseClient } from '@/lib/supabase-server'
import Badge from '@/components/ui/Badge'
import DashboardCharts from '@/components/DashboardCharts'
import { DashboardQuickActions } from '@/components/DashboardQuickActions'
import { TeamTasksDashboard } from '@/components/TeamTasksDashboard'
import DashboardMetricCard from '@/components/ui/DashboardMetricCard'
import ExportPortfolioCSV from '@/components/ExportPortfolioCSV'
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
import type { Company, Round, Investment, CapTableEntry, Reserve, CompanyWithMetrics, Safe, TaskWithRelations, TeamMember } from '@/lib/types'
import { DollarSign, TrendingUp, BarChart2, Activity, Percent, ArrowUpRight } from 'lucide-react'
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

  // Fetch current user for personalised greeting
  const { data: { user } } = await supabase.auth.getUser()

  let companiesQuery = supabase.from('companies').select('*').order('name')
  if (strategy) companiesQuery = companiesQuery.eq('strategy', strategy)

  const [
    { data: companies },
    { data: rounds },
    { data: investments },
    { data: capTable },
    { data: reserves },
    { data: safes },
    { data: tasks },
    { data: teamMembers },
    { data: currentMember },
  ] = await Promise.all([
    companiesQuery,
    supabase.from('rounds').select('*'),
    supabase.from('investments').select('*').order('date'),
    supabase.from('cap_table').select('*'),
    supabase.from('reserves').select('*'),
    supabase.from('safes').select('*').order('date'),
    supabase.from('tasks').select(`
      *,
      assignees:task_assignees(
        id, task_id, assigned_to, assigned_at, assigned_by
      )
    `).order('created_at', { ascending: false }),
    supabase.from('team_members').select('*').order('name', { ascending: true }),
    supabase.from('team_members').select('name').eq('id', user?.id ?? '').maybeSingle(),
  ])

  const firstName = (currentMember as any)?.name?.split(' ')[0] ?? 'there'

  const companiesList   = (companies   ?? []) as Company[]
  const roundsList      = (rounds      ?? []) as Round[]
  const investmentsList = (investments ?? []) as Investment[]
  const capTableList    = (capTable    ?? []) as CapTableEntry[]
  const reservesList    = (reserves    ?? []) as Reserve[]
  const safesList       = (safes       ?? []) as Safe[]
  const teamMembersList = (teamMembers ?? []) as TeamMember[]

  // Hydrate assignee team_member info
  const memberMap = new Map(teamMembersList.map(m => [m.id, m]))
  const tasksList = ((tasks ?? []).map(t => ({
    ...t,
    assignees: (t.assignees || []).map((a: any) => ({
      ...a,
      team_member: memberMap.get(a.assigned_to) ?? null,
    })),
  }))) as TaskWithRelations[]

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
    .slice(-8)

  const byValue = [...companiesWithMetrics]
    .filter(c => c.currentValue > 0)
    .sort((a, b) => a.currentValue - b.currentValue)
    .slice(-8)

  const byMoic = [...companiesWithMetrics]
    .filter(c => c.moic > 0)
    .sort((a, b) => a.moic - b.moic)
    .slice(-8)

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

  const strategyLabel =
    strategy === 'impact'  ? 'Menomadin Impact'   :
    strategy === 'venture' ? 'Menomadin Catalyst' :
    'All Strategies'

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
              Welcome back, {firstName} 👋
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

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div className="px-8 pb-6">
        <DashboardQuickActions />
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
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Menomadin Impact</span>
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
              <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 border-l-4 border-l-blue-500">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Menomadin Catalyst</span>
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

      {/* ── Team Tasks ───────────────────────────────────────────────────── */}
      <div className="px-8 mb-6">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Team Tasks</h2>
            <Link href="/tasks" className="text-xs font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              View all →
            </Link>
          </div>
          <TeamTasksDashboard tasks={tasksList} teamMembers={teamMembersList} />
        </div>
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <div className="px-8 pb-8">
        <DashboardCharts companies={companiesWithMetrics} />
      </div>
    </div>
  )
}
