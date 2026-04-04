'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { TaskStatus, TaskPriority } from '@/lib/types'

interface TaskFiltersProps {
  onFiltersChange: (filters: TaskFilters) => void
}

export interface TaskFilters {
  dateRangeStart?: Date
  dateRangeEnd?: Date
  status?: TaskStatus
  priority?: TaskPriority
  company?: string
}

export default function TaskFiltersPanel({ onFiltersChange }: TaskFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [status, setStatus] = useState<TaskStatus | ''>('')
  const [priority, setPriority] = useState<TaskPriority | ''>('')

  const handleApplyFilters = () => {
    const filters: TaskFilters = {}

    if (dateStart) {
      filters.dateRangeStart = new Date(dateStart)
    }
    if (dateEnd) {
      filters.dateRangeEnd = new Date(dateEnd)
    }
    if (status) {
      filters.status = status
    }
    if (priority) {
      filters.priority = priority
    }

    onFiltersChange(filters)
  }

  const handleReset = () => {
    setDateStart('')
    setDateEnd('')
    setStatus('')
    setPriority('')
    onFiltersChange({})
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
      >
        {showFilters ? '▼ Hide Filters' : '▶ Show Filters'}
      </button>

      {showFilters && (
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/30 space-y-3">
          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Date Range
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateStart}
                onChange={e => setDateStart(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
              <input
                type="date"
                value={dateEnd}
                onChange={e => setDateEnd(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus | '')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            >
              <option value="">All Statuses</option>
              <option value="To do">To do</option>
              <option value="In progress">In progress</option>
              <option value="Waiting">Waiting</option>
              <option value="Done">Done</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as TaskPriority | '')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleApplyFilters} className="flex-1">
              Apply Filters
            </Button>
            <Button size="sm" variant="secondary" onClick={handleReset} className="flex-1">
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
