'use client'

import { useState, useMemo } from 'react'
import TaskMetricsCards from '@/components/TaskMetrics/TaskMetricsCards'
import TaskCharts from '@/components/TaskMetrics/TaskCharts'
import TaskFiltersPanel, { type TaskFilters } from '@/components/TaskMetrics/TaskFiltersPanel'
import { calculateTaskMetrics, getTasksByDateRange, getTasksByStatus, getTasksByPriority } from '@/lib/task-analytics'
import type { TaskWithRelations } from '@/lib/types'

interface Props {
  tasks: TaskWithRelations[]
}

export default function TaskAnalyticsClient({ tasks }: Props) {
  const [filters, setFilters] = useState<TaskFilters>({})

  const filteredTasks = useMemo(() => {
    let result = tasks

    // Apply date range filter
    if (filters.dateRangeStart && filters.dateRangeEnd) {
      result = getTasksByDateRange(result, filters.dateRangeStart, filters.dateRangeEnd)
    }

    // Apply status filter
    if (filters.status) {
      result = getTasksByStatus(result, filters.status)
    }

    // Apply priority filter
    if (filters.priority) {
      result = getTasksByPriority(result, filters.priority)
    }

    return result
  }, [tasks, filters])

  const metrics = useMemo(() => {
    return calculateTaskMetrics(
      filteredTasks,
      filters.dateRangeStart,
      filters.dateRangeEnd
    )
  }, [filteredTasks, filters])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TaskFiltersPanel onFiltersChange={setFilters} />

      {/* Metrics Summary */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Overview
        </h2>
        <TaskMetricsCards metrics={metrics} />
      </div>

      {/* Charts */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Analysis
        </h2>
        <TaskCharts metrics={metrics} />
      </div>

      {/* Summary Text */}
      {filteredTasks.length === 0 ? (
        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 text-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            No tasks found with the current filters.
          </p>
        </div>
      ) : (
        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/30">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Summary</h3>
          <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            <li>
              • You have <strong>{metrics.total}</strong> total tasks
              {metrics.completed > 0 && ` with <strong>${metrics.completionRate}%</strong> completion rate`}
            </li>
            {metrics.overdue > 0 && (
              <li>
                • <strong>{metrics.overdue}</strong> task{metrics.overdue !== 1 ? 's are' : ' is'} overdue
              </li>
            )}
            {metrics.dueToday > 0 && (
              <li>
                • <strong>{metrics.dueToday}</strong> task{metrics.dueToday !== 1 ? 's are' : ' is'} due today
              </li>
            )}
            {metrics.dueThisWeek > 0 && (
              <li>
                • <strong>{metrics.dueThisWeek}</strong> task{metrics.dueThisWeek !== 1 ? 's are' : ' is'} due this week
              </li>
            )}
            {metrics.avgTimeToComplete > 0 && (
              <li>
                • Average time to complete: <strong>{metrics.avgTimeToComplete} days</strong>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
