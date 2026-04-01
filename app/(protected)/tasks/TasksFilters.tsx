'use client'

import { ChevronDown } from 'lucide-react'
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
}

const STATUSES: TaskStatus[] = ['To do', 'In progress', 'Waiting', 'Done', 'Cancelled']
const PRIORITIES = [
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  { value: 'low', label: 'Low', color: 'bg-emerald-100 text-emerald-700' },
]

const STATUS_COLORS: Record<TaskStatus, string> = {
  'To do': 'text-slate-600 dark:text-slate-400',
  'In progress': 'text-blue-600 dark:text-blue-400',
  'Waiting': 'text-amber-600 dark:text-amber-400',
  'Done': 'text-emerald-600 dark:text-emerald-400',
  'Cancelled': 'text-slate-400 dark:text-slate-500',
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
    <aside className="w-56 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto flex flex-col">
      {/* Stats */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Active</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Completed</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
          </div>
          {stats.overdue > 0 && (
            <div className="col-span-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs">Overdue</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.overdue} tasks</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex-1 p-4 space-y-6">
        {/* Status Filter */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">Status</h3>
          <div className="space-y-2">
            {STATUSES.map(status => (
              <label key={status} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilter.includes(status)}
                  onChange={() => toggleStatus(status)}
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className={`text-sm ${STATUS_COLORS[status]}`}>{status}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">Priority</h3>
          <div className="space-y-2">
            {PRIORITIES.map(p => (
              <label key={p.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={priorityFilter.includes(p.value)}
                  onChange={() => togglePriority(p.value)}
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Company Filter */}
        {companies.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">Company</h3>
            <select
              value={companyFilter}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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

        {/* Completed Filter */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => onIncludeCompletedChange(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Show completed</span>
          </label>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={clearAllFilters}
            className="w-full text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}
    </aside>
  )
}
