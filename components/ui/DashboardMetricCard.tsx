'use client'

import { BarChart, Bar, Cell, ResponsiveContainer } from 'recharts'

interface Props {
  label: string
  value: string
  sub?: string
  chartData: number[]
  accentColor: string
  icon?: React.ReactNode
}

export default function DashboardMetricCard({
  label,
  value,
  sub,
  chartData,
  accentColor,
  icon,
}: Props) {
  const bars = chartData.map((v, i) => ({ v, i }))

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200">
      {/* Icon + label */}
      <div className="flex items-center gap-2.5 mb-4">
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${accentColor}18` }}
          >
            {icon}
          </div>
        )}
        <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider leading-tight">
          {label}
        </p>
      </div>

      {/* Value + mini sparkline */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight leading-none">
            {value}
          </p>
          {sub && (
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-2 leading-tight">
              {sub}
            </p>
          )}
        </div>

        {bars.length > 0 && (
          <div className="w-[68px] h-9 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} barCategoryGap="18%" margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <Bar dataKey="v" radius={[2, 2, 0, 0]}>
                  {bars.map((_, index) => (
                    <Cell
                      key={index}
                      fill={index === bars.length - 1 ? accentColor : `${accentColor}55`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
