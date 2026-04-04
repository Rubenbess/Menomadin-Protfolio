'use client'

import { CheckCircle2, AlertCircle, TrendingUp, Clock } from 'lucide-react'
import type { TaskMetrics } from '@/lib/task-analytics'

interface Props {
  metrics: TaskMetrics
}

export default function TaskMetricsCards({ metrics }: Props) {
  const cards = [
    {
      label: 'Total Tasks',
      value: metrics.total,
      icon: <CheckCircle2 size={20} />,
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Completion Rate',
      value: `${metrics.completionRate}%`,
      icon: <TrendingUp size={20} />,
      color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    },
    {
      label: 'Completed',
      value: metrics.completed,
      icon: <CheckCircle2 size={20} />,
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Overdue',
      value: metrics.overdue,
      icon: <AlertCircle size={20} />,
      color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    },
    {
      label: 'Due Today',
      value: metrics.dueToday,
      icon: <Clock size={20} />,
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Avg. Days to Complete',
      value: metrics.avgTimeToComplete,
      icon: <Clock size={20} />,
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(card => (
        <div
          key={card.label}
          className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-500 uppercase mb-1">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {card.value}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${card.color}`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
