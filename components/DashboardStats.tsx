'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

interface DashboardStatsProps {
  label: string
  value: string | number
  change?: number
  isPositive?: boolean
  icon?: React.ReactNode
}

export function DashboardStat({
  label,
  value,
  change,
  isPositive,
  icon,
}: DashboardStatsProps) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white mt-2">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive !== undefined && (
                <>
                  {isPositive ? (
                    <TrendingUp size={14} className="text-emerald-600" />
                  ) : (
                    <TrendingDown size={14} className="text-red-600" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      isPositive ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {Math.abs(change).toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-neutral-500 dark:text-neutral-700">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface DashboardStatsGridProps {
  stats: DashboardStatsProps[]
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, idx) => (
        <DashboardStat key={idx} {...stat} />
      ))}
    </div>
  )
}
