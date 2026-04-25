'use client'

import { MetricCard } from '@/components/charts/MetricCard'
import {
  InvestmentsByStageChart,
  SectorDistributionChart,
  PerformanceChart,
} from '@/components/charts/PortfolioChart'
import {
  getInvestmentsByStage,
  getInvestmentsBySector,
  getTopPerformers,
  getUnderperformers,
  formatCurrency,
  formatPercent,
  formatMultiple,
} from '@/lib/analytics-utils'
import { TrendingUp, Target, Zap, BarChart3 } from 'lucide-react'

interface Props {
  companies: any[]
  investments: any[]
  portfolioIrr: number
  portfolioDpi: number
}

export default function AnalyticsClient({ companies, investments, portfolioIrr, portfolioDpi }: Props) {
  // Aggregate metrics from pre-computed company data
  const totalInvested  = companies.reduce((s, c) => s + (c.totalInvested  || 0), 0)
  const currentValue   = companies.reduce((s, c) => s + (c.currentValue   || 0), 0)
  const gainLoss       = currentValue - totalInvested
  const gainLossPct    = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0
  const tvpi           = totalInvested > 0 ? currentValue / totalInvested : 0
  const moic           = tvpi
  const numCompanies   = companies.length
  const numActiveDeals = companies.filter(c => c.status === 'active').length
  const numExits       = companies.filter(c => c.status === 'exited').length

  const rawStageData   = getInvestmentsByStage(companies)
  const sectorData     = getInvestmentsBySector(companies)
  const topPerformers  = getTopPerformers(companies, 5)
  const underperformers = getUnderperformers(companies, 5)

  const stageData = rawStageData.map(s => ({ name: s.stage, value: s.amount }))

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 size={22} className="text-primary-500" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
            Analytics
          </h1>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Portfolio performance and investment metrics
        </p>
      </div>

      {/* Key Metrics — row 1 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
          Portfolio Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Invested"
            value={formatCurrency(totalInvested)}
            subtitle={`${numCompanies} companies`}
            icon={<Target size={20} />}
          />
          <MetricCard
            title="Current Value"
            value={formatCurrency(currentValue)}
            change={gainLossPct}
            isPositive={gainLoss >= 0}
            icon={<TrendingUp size={20} />}
          />
          <MetricCard
            title="TVPI"
            value={formatMultiple(tvpi)}
            subtitle="Total Value to Paid-in"
            icon={<Zap size={20} />}
          />
          <MetricCard
            title="MOIC"
            value={formatMultiple(moic)}
            subtitle="Money Multiple"
          />
        </div>

        {/* Key Metrics — row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="IRR"
            value={portfolioIrr !== 0 ? formatPercent(portfolioIrr) : 'N/A'}
            subtitle="Internal Rate of Return"
          />
          <MetricCard
            title="DPI"
            value={formatMultiple(portfolioDpi)}
            subtitle="Distributions to Paid-in"
          />
          <MetricCard
            title="Active Deals"
            value={String(numActiveDeals)}
            subtitle={`of ${numCompanies} total`}
          />
          <MetricCard
            title="Exits"
            value={String(numExits)}
            subtitle={numCompanies > 0 ? `${((numExits / numCompanies) * 100).toFixed(0)}% exit rate` : '—'}
          />
        </div>
      </section>

      {/* Investment Distribution Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InvestmentsByStageChart data={stageData} />
        <SectorDistributionChart data={sectorData} />
      </section>

      {/* Top / Under performers */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-6">
            Top Performers
          </h3>
          <div className="space-y-4">
            {topPerformers.length > 0 ? (
              topPerformers.map((company, idx) => (
                <div key={idx} className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-700 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white text-sm">{company.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Invested: {formatCurrency(company.invested)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-emerald-600">{company.moic.toFixed(2)}x</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">{company.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No performers yet</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-6">
            Underperformers
          </h3>
          <div className="space-y-4">
            {underperformers.length > 0 ? (
              underperformers.map((company, idx) => (
                <div key={idx} className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-700 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white text-sm">{company.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Invested: {formatCurrency(company.invested)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-red-500">{company.moic.toFixed(2)}x</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">{company.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No underperformers</p>
            )}
          </div>
        </div>
      </section>

      {/* Company MOIC chart */}
      {companies.length > 0 && (
        <section>
          <PerformanceChart data={companies.slice(0, 10)} />
        </section>
      )}

      {/* Sector breakdown table */}
      <section className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-6">
          Sector Breakdown
        </h3>
        {sectorData.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No sector data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Sector</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Companies</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Invested</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Current Value</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Return</th>
                </tr>
              </thead>
              <tbody>
                {sectorData.map((sector, idx) => {
                  const gain = sector.currentValue - sector.invested
                  const gainPct = sector.invested > 0 ? (gain / sector.invested) * 100 : 0
                  return (
                    <tr key={idx} className="border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">{sector.sector}</td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400">{sector.count}</td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-900 dark:text-white">{formatCurrency(sector.invested)}</td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-900 dark:text-white">{formatCurrency(sector.currentValue)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${gainPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
