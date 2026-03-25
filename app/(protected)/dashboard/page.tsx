import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MetricCard } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import DashboardCharts from '@/components/DashboardCharts'
import {
  calcCurrentValue,
  calcMOIC,
  calcTVPI,
  getFundOwnershipPct,
  getLatestRound,
  totalInvestedInCompany,
  fmt$$,
  fmtMultiple,
  fmtPct,
} from '@/lib/calculations'
import type { Company, Round, Investment, CapTableEntry, Reserve, CompanyWithMetrics } from '@/lib/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ strategy?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { strategy } = await searchParams
  const supabase = await createServerSupabaseClient()

  let companiesQuery = supabase.from('companies').select('*').order('name')
  if (strategy) companiesQuery = companiesQuery.eq('strategy', strategy)

  const [{ data: companies }, { data: rounds }, { data: investments }, { data: capTable }, { data: reserves }] =
    await Promise.all([
      companiesQuery,
      supabase.from('rounds').select('*'),
      supabase.from('investments').select('*').order('date'),
      supabase.from('cap_table').select('*'),
      supabase.from('reserves').select('*'),
    ])

  const companiesList   = (companies   ?? []) as Company[]
  const roundsList      = (rounds      ?? []) as Round[]
  const investmentsList = (investments ?? []) as Investment[]
  const capTableList    = (capTable    ?? []) as CapTableEntry[]
  const reservesList    = (reserves    ?? []) as Reserve[]

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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6 md:mb-8">
        <MetricCard label="Total Invested"    value={fmt$$(totalInvested)}      accent="violet" />
        <MetricCard label="Portfolio Value"   value={fmt$$(totalCurrentValue)}  accent="emerald" />
        <MetricCard label="TVPI"              value={fmtMultiple(tvpi)}         accent="blue" />
        <MetricCard label="MOIC"              value={fmtMultiple(moic)}         accent="amber" />
        <MetricCard label="Companies"         value={String(companiesList.length)} />
        <MetricCard label="Capital Deployed"  value={fmt$$(totalInvested)} />
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Portfolio Companies</h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2.5 py-0.5">
            {companiesWithMetrics.length}
          </span>
        </div>

        {companiesWithMetrics.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-slate-400 mb-4">No companies found.</p>
            <Link href="/companies" className="inline-flex items-center text-sm font-semibold text-violet-600 hover:text-violet-700">
              Add a company →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Entry Stage</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Invested to Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ownership</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Planned Reserves</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Deployed Reserves</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Initial Investment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {companiesWithMetrics.map((co) => (
                  <tr key={co.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {co.logo_url ? (
                          <img src={co.logo_url} alt={co.name} className="w-7 h-7 rounded-lg object-contain bg-slate-50 ring-1 ring-slate-100 flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-violet-600">{co.name[0]}</span>
                          </div>
                        )}
                        <div>
                          <Link href={`/companies/${co.id}`} className="font-semibold text-slate-900 hover:text-violet-600 transition-colors">
                            {co.name}
                          </Link>
                          {co.sector && <p className="text-xs text-slate-400">{co.sector}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge value={co.status} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{co.entry_stage ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{co.totalInvested > 0 ? fmt$$(co.totalInvested) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{co.ownershipPct > 0 ? fmtPct(co.ownershipPct) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{co.plannedReserves > 0 ? fmt$$(co.plannedReserves) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{co.deployedReserves > 0 ? fmt$$(co.deployedReserves) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{co.initialInvestment > 0 ? fmt$$(co.initialInvestment) : <span className="text-slate-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="mt-6">
        <DashboardCharts companies={companiesWithMetrics} />
      </div>
    </div>
  )
}
