'use client'

import { calculateTaskHealth, getHealthColor, getHealthIcon } from '@/lib/task-health'
import type { TaskWithRelations } from '@/lib/types'

interface Props {
  task: TaskWithRelations
  showDetails?: boolean
}

export function TaskHealthBadge({ task, showDetails = false }: Props) {
  const health = calculateTaskHealth(task)

  if (!showDetails) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getHealthColor(health.level)}`}
        title={`Health score: ${health.score}/100 (${health.level})`}
      >
        <span>{getHealthIcon(health.level)}</span>
        <span>{health.score}</span>
      </span>
    )
  }

  return (
    <div className="space-y-3">
      {/* Score Summary */}
      <div className={`p-3 rounded-lg ${getHealthColor(health.level)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getHealthIcon(health.level)}</span>
            <div>
              <p className="text-xs font-semibold uppercase">Task Health</p>
              <p className="text-sm font-bold capitalize">{health.level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{health.score}</p>
            <p className="text-xs">/100</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-current transition-all duration-300"
            style={{
              width: `${health.score}%`,
              opacity: 0.8,
            }}
          />
        </div>
      </div>

      {/* Health Factors */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-500 uppercase">
          Health Factors
        </p>
        <div className="space-y-1.5">
          {Object.entries(health.factors).map(([key, factor]) => (
            <div key={key} className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-900 dark:text-white capitalize">
                  {key}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-500">{factor.label}</p>
              </div>
              <div className="text-right ml-2">
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{factor.score}</p>
                <div className="w-12 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {health.recommendations.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-500 uppercase">
            Recommendations
          </p>
          <ul className="space-y-1">
            {health.recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex gap-2 text-xs text-neutral-700 dark:text-neutral-400"
              >
                <span className="text-primary-500 flex-shrink-0 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
