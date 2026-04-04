'use client'

import { ChevronDown } from 'lucide-react'
import { TaskSavedFilters } from '@/components/TaskSavedFilters'
import type { TaskStatus } from '@/lib/types'

interface Props {
  statusFilter: TaskStatus[]
  onStatusChange: (status: TaskStatus[]) => void
  priorityFilter: string[]
  onPriorityChange: (priority: string[]) => void
  companyFilter: string
  onCompanyChange: (company: string) => void
  includeCompleted: boolean
  onIncludeCompletedChange: (include: boolean) => void
  companies: { id: string; name: string }[]
  stats: {
    total: number
    active: number
    completed: number
    overdue: number
  }
  onApplySavedFilter?: (filters: any) => void
}

const STATUSES: TaskStatus[] = ['To do', 'In progress', 'Waiting', 'Done', 'Cancelled']
const PRIORITIES = [
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  { value: 'low', label: 'Low', color: 'bg-emerald-100 text-emerald-700' },
]

const STATUS_COLORS: Record<TaskStatus, string> = {
  'To do': 'text-neutral-700 dark:text-neutral-500',
  'In progress': 'text-blue-600 dark:text-blue-400',
  'Waiting': 'text-amber-600 dark:text-amber-400',
  'Done': 'text-emerald-600 dark:text-emerald-400',
  'Cancelled': 'text-neutral-500 dark:text-neutral-600',
}

export default function TasksFilters({
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  companyFilter,
  onCompanyChange,
  includeCompleted,
  onIncludeCompletedChange,
  companies,
  stats,
  onApplySavedFilter,
}: Props) {
  const toggleStatus = (status: TaskStatus) => {
    if (statusFilter.includes(status)) {
      onStatusChange(statusFilter.filter(s => s !== status))
    } else {
      onStatusChange([...statusFilter, status])
    }
  }

  const togglePriority = (priority: string) => {
    if (priorityFilter.includes(priority)) {
      onPriorityChange(priorityFilter.filter(p => p !== priority))
    } else {
      onPriorityChange([...priorityFilter, priority])
    }
  }

  const clearAllFilters = () => {
    onStatusChange([])
    onPriorityChange([])
    onCompanyChange('')
  }

  const hasActiveFilters = statusFilter.length > 0 || priorityFilter.length > 0 || companyFilter

  return (
    <aside className="w-64 bg-white dark:bg-neutral-800/30 border-r border-neutral-200 dark:border-neutral-700 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-widest mb-6">Filters</h2>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <p className="text-xs text-neutral-700 dark:text-neutral-500 font-medium mb-1">Active</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.active}</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <p className="text-xs text-neutral-700 dark:text-neutral-500 font-medium mb-1">Done</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-1 px-6 py-6 space-y-8">
        {/* Status */}
        <div>
          <h3 className="section-title">Status</h3>
          <div className="space-y-3">
            {STATUSES.map(status => (
              <label key={status} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                <input
                  type="checkbox"
                  checked={statusFilter.includes(status)}
                  onChange={() => toggleStatus(status)}
                  className="w-4 h-4 accent-gold-500"
                />
                <span className={`text-sm font-medium ${STATUS_COLORS[status]}`}>{status}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <h3 className="section-title">Priority</h3>
          <div className="space-y-3">
            {PRIORITIES.map(p => (
              <label key={p.value} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                <input
                  type="checkbox"
                  checked={priorityFilter.includes(p.value)}
                  onChange={() => togglePriority(p.value)}
                  className="w-4 h-4 accent-gold-500"
                />
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-300">{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Company */}
        {companies.length > 0 && (
          <div>
            <h3 className="section-title">Company</h3>
            <select
              value={companyFilter}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="field-select text-sm"
            >
              <option value="">All companies</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Show Completed */}
        <label className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={(e) => onIncludeCompletedChange(e.target.checked)}
            className="w-4 h-4 accent-gold-500"
          />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-300">Show completed</span>
        </label>
      </div>

      {/* Saved Filters */}
      <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
        <TaskSavedFilters
          currentFilters={{
            status: statusFilter,
            priority: priorityFilter,
            company_id: companyFilter,
            include_completed: includeCompleted,
          }}
          onFilterApply={(filters) => {
            if (filters.status) onStatusChange(filters.status)
            if (filters.priority) onPriorityChange(filters.priority)
            if (filters.company_id) onCompanyChange(filters.company_id)
            if (typeof filters.include_completed === 'boolean') {
              onIncludeCompletedChange(filters.include_completed)
            }
            onApplySavedFilter?.(filters)
          }}
        />
      </div>

      {/* Clear Button */}
      {hasActiveFilters && (
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={clearAllFilters}
            className="w-full px-4 py-2 text-sm font-semibold text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 rounded-lg transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}
    </aside>
  )
}
