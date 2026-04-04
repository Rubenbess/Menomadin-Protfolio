'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { TaskRecurrenceRule, RecurrenceFrequency } from '@/lib/types'

interface Props {
  rule?: TaskRecurrenceRule | null
  onSubmit: (data: {
    frequency: RecurrenceFrequency
    interval: number
    day_of_week: number | null
    day_of_month: number | null
    next_occurrence: string
    is_active: boolean
  }) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
  submitLabel?: string
}

export default function TaskRecurrenceForm({
  rule,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Recurrence',
}: Props) {
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(rule?.frequency || 'weekly')
  const [interval, setInterval] = useState(rule?.interval || 1)
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(rule?.day_of_week ?? new Date().getDay())
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(rule?.day_of_month ?? new Date().getDate())
  const [nextOccurrence, setNextOccurrence] = useState(
    rule?.next_occurrence || new Date(Date.now() + 86400000).toISOString().split('T')[0]
  )
  const [isActive, setIsActive] = useState(rule?.is_active ?? true)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const result = onSubmit({
        frequency,
        interval: Math.max(1, interval),
        day_of_week: frequency === 'weekly' ? dayOfWeek : null,
        day_of_month: frequency === 'monthly' ? dayOfMonth : null,
        next_occurrence: nextOccurrence,
        is_active: isActive,
      })

      // Handle both sync and async submit
      if (result instanceof Promise) {
        await result
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recurrence rule')
    }
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Frequency */}
      <div>
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-3">
          Repeat frequency
        </label>
        <div className="space-y-2">
          {(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const).map(freq => (
            <label key={freq} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value={freq}
                checked={frequency === freq}
                onChange={e => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-4 h-4 rounded-full border-neutral-300 text-primary-500 dark:bg-neutral-800 dark:border-neutral-600"
              />
              <span className="text-sm text-neutral-800 dark:text-neutral-300 capitalize">
                {freq === 'biweekly' ? 'Every 2 weeks' : freq === 'quarterly' ? 'Every 3 months' : freq}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Interval */}
      <div>
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1.5">
          Every
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="99"
            value={interval}
            onChange={e => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
          />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {frequency === 'daily' && `day${interval > 1 ? 's' : ''}`}
            {frequency === 'weekly' && `week${interval > 1 ? 's' : ''}`}
            {frequency === 'biweekly' && 'weeks'}
            {frequency === 'monthly' && `month${interval > 1 ? 's' : ''}`}
            {frequency === 'quarterly' && `quarter${interval > 1 ? 's' : ''}`}
            {frequency === 'yearly' && `year${interval > 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Day of Week (Weekly) */}
      {frequency === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-2">
            On
          </label>
          <div className="grid grid-cols-2 gap-2">
            {dayNames.map((day, index) => (
              <label key={index} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dayOfWeek"
                  value={index}
                  checked={dayOfWeek === index}
                  onChange={e => setDayOfWeek(parseInt(e.target.value))}
                  className="w-4 h-4 rounded-full border-neutral-300 text-primary-500 dark:bg-neutral-800 dark:border-neutral-600"
                />
                <span className="text-sm text-neutral-800 dark:text-neutral-300">{day}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Day of Month (Monthly) */}
      {frequency === 'monthly' && (
        <div>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1.5">
            On day of month
          </label>
          <select
            value={dayOfMonth || new Date().getDate()}
            onChange={e => setDayOfMonth(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <option key={day} value={day}>
                Day {day}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Next Occurrence */}
      <div>
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1.5">
          Next occurrence
        </label>
        <input
          type="date"
          value={nextOccurrence}
          onChange={e => setNextOccurrence(e.target.value)}
          className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
        />
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={e => setIsActive(e.target.checked)}
          className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-gold-500 dark:bg-neutral-800 dark:border-neutral-600"
        />
        <label htmlFor="isActive" className="text-sm text-neutral-800 dark:text-neutral-300">
          Active
        </label>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2.5 ring-1 ring-red-200 dark:ring-red-900">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={isLoading} className="flex-1">
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
