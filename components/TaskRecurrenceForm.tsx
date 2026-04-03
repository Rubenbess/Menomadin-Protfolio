'use client'

import { useState, useCallback, memo } from 'react'
import { Plus, X, Clock } from 'lucide-react'

type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'

interface TaskRecurrenceFormProps {
  onSave: (recurrence: {
    frequency: RecurrenceFrequency
    interval: number
    daysOfWeek?: number[]
    dayOfMonth?: number
    isActive: boolean
  }) => void
  onCancel: () => void
  initialData?: any
}

const TaskRecurrenceForm = memo(function TaskRecurrenceForm({
  onSave,
  onCancel,
  initialData,
}: TaskRecurrenceFormProps) {
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    initialData?.frequency || 'weekly'
  )
  const [interval, setInterval] = useState(initialData?.interval || 1)
  const [dayOfMonth, setDayOfMonth] = useState(initialData?.dayOfMonth || 1)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    initialData?.daysOfWeek || [1] // Monday by default
  )
  const [isActive, setIsActive] = useState(initialData?.isActive !== false)

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handleDayToggle = useCallback((dayIndex: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort()
    )
  }, [])

  const handleSave = useCallback(() => {
    onSave({
      frequency,
      interval,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      daysOfWeek: frequency === 'weekly' ? daysOfWeek : undefined,
      isActive,
    })
  }, [frequency, interval, dayOfMonth, daysOfWeek, isActive, onSave])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Frequency Select */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Frequency
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
          className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {/* Interval */}
      {(frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-900 dark:text-white">
            Every {frequency === 'weekly' ? 'N weeks' : frequency === 'monthly' ? 'N months' : 'N days'}
          </label>
          <input
            type="number"
            min="1"
            max="52"
            value={interval}
            onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          />
        </div>
      )}

      {/* Days of Week (for weekly recurrence) */}
      {frequency === 'weekly' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-900 dark:text-white">
            Repeat on days
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => handleDayToggle(index)}
                className={`p-2 sm:p-2 rounded-lg font-medium text-xs sm:text-sm transition-colors touch-manipulation ${
                  daysOfWeek.includes(index)
                    ? 'bg-amber-700 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-slate-700'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day of Month (for monthly recurrence) */}
      {frequency === 'monthly' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-900 dark:text-white">
            Day of month
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          />
        </div>
      )}

      {/* Active Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <label htmlFor="active" className="text-sm text-neutral-800 dark:text-neutral-300">
          Activate this recurring task
        </label>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2.5 sm:py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 touch-manipulation"
        >
          <Clock size={16} />
          Set Recurrence
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 sm:py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-300 rounded-lg font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors touch-manipulation"
        >
          Cancel
        </button>
      </div>
    </div>
  )
})

export default TaskRecurrenceForm
