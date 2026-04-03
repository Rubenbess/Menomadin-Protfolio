import { ArrowUp, ArrowDown } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number
  isPositive?: boolean
  icon?: React.ReactNode
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  isPositive,
  icon,
}: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-3">
              {isPositive !== undefined && (
                <>
                  {isPositive ? (
                    <ArrowUp size={14} className="text-emerald-600" />
                  ) : (
                    <ArrowDown size={14} className="text-red-600" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      isPositive
                        ? 'text-emerald-600'
                        : 'text-red-600'
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
          <div className="text-slate-400 dark:text-slate-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
