'use client'

import { MetricCard } from '@/components/charts/MetricCard'
import {
  InvestmentsByStageChart,
  SectorDistributionChart,
  PerformanceChart,
} from '@/components/charts/PortfolioChart'
import {
  calculatePortfolioMetrics,
  getInvestmentsByStage,
  getInvestmentsBySector,
  getTopPerformers,
  getUnderperformers,
  formatCurrency,
  formatPercent,
  formatMultiple,
} from '@/lib/analytics-utils'
import { TrendingUp, TrendingDown, Target, Zap } from 'lucide-react'

interface AnalyticsClientProps {
  companies: any[]
  investments: any[]
}

export default function AnalyticsClient({ companies, investments }: AnalyticsClientProps) {
  const metrics = calculatePortfolioMetrics(companies)
  const rawStageData = getInvestmentsByStage(companies)
  const sectorData = getInvestmentsBySector(companies)
  const topPerformers = getTopPerformers(companies, 5)
  const underperformers = getUnderperformers(companies, 5)

  // Transform stage data for pie chart
  const stageData = rawStageData.map(stage => ({
    name: stage.stage,
    value: stage.amount,
  }))

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Portfolio Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Invested"
            value={formatCurrency(metrics.totalInvested)}
            subtitle={`${metrics.numCompanies} companies`}
            icon={<Target size={20} />}
          />
          <MetricCard
            title="Current Value"
            value={formatCurrency(metrics.currentValue)}
            change={metrics.gainLossPercent}
            isPositive={metrics.gainLoss >= 0}
            icon={<TrendingUp size={20} />}
          />
          <MetricCard
            title="TVPI"
            value={formatMultiple(metrics.tvpi)}
            subtitle="Total Value to Paid-in"
            icon={<Zap size={20} />}
          />
          <MetricCard
            title="MOIC"
            value={formatMultiple(metrics.moic)}
            subtitle="Money Multiple"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="IRR"
            value={formatPercent(metrics.irr)}
            subtitle="Internal Rate of Return"
          />
          <MetricCard
            title="DPI"
            value={formatMultiple(metrics.dpi)}
            subtitle="Distributions to Paid-in"
          />
          <MetricCard
            title="Active Deals"
            value={metrics.numActiveDeals}
            subtitle={`of ${metrics.numCompanies} total`}
          />
          <MetricCard
            title="Exits"
            value={metrics.numExits}
            subtitle={`${((metrics.numExits / metrics.numCompanies) * 100).toFixed(0)}% exit rate`}
          />
        </div>
      </section>

      {/* Investment Distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InvestmentsByStageChart data={stageData} />
        <SectorDistributionChart data={sectorData} />
      </section>

      {/* Performance Analysis */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Top Performers
          </h3>
          <div className="space-y-4">
            {topPerformers.length > 0 ? (
              topPerformers.map((company, idx) => (
                <div key={idx} className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {company.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Invested: {formatCurrency(company.invested)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-600">
                      {company.moic.toFixed(2)}x
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {company.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 dark:text-slate-400">No performers yet</p>
            )}
          </div>
        </div>

        {/* Underperformers */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Underperformers
          </h3>
          <div className="space-y-4">
            {underperformers.length > 0 ? (
              underperformers.map((company, idx) => (
                <div key={idx} className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {company.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Invested: {formatCurrency(company.invested)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-red-600">
                      {company.moic.toFixed(2)}x
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {company.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 dark:text-slate-400">No underperformers</p>
            )}
          </div>
        </div>
      </section>

      {/* Performance Chart */}
      <section>
        {companies.length > 0 && <PerformanceChart data={companies.slice(0, 10)} />}
      </section>

      {/* Sector Breakdown Table */}
      <section className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
          Sector Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  Sector
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                  Companies
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                  Invested
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                  Current Value
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                  Return
                </th>
              </tr>
            </thead>
            <tbody>
              {sectorData.map((sector, idx) => {
                const gain = sector.currentValue - sector.invested
                const gainPercent = sector.invested > 0 ? (gain / sector.invested) * 100 : 0
                return (
                  <tr
                    key={idx}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {sector.sector}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                      {sector.count}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-medium">
                      {formatCurrency(sector.invested)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-medium">
                      {formatCurrency(sector.currentValue)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        gainPercent >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
