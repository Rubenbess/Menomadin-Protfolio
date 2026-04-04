'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import TaskRecurrenceForm from '@/components/forms/TaskRecurrenceForm'
import { createRecurrenceRule, updateRecurrenceRule } from '@/actions/task-recurrence'
import type { TaskRecurrenceRule, RecurrenceFrequency } from '@/lib/types'

interface Props {
  open: boolean
  rule?: TaskRecurrenceRule | null
  taskId?: string
  onClose: () => void
  onSubmit: (rule: TaskRecurrenceRule) => void
}

export default function RecurrenceFormModal({
  open,
  rule,
  taskId,
  onClose,
  onSubmit,
}: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleFormSubmit = async (data: {
    frequency: RecurrenceFrequency
    interval: number
    day_of_week: number | null
    day_of_month: number | null
    next_occurrence: string
    is_active: boolean
  }) => {
    setIsLoading(true)

    try {
      let result

      if (rule?.id) {
        // Update existing rule
        result = await updateRecurrenceRule(rule.id, data)
      } else {
        // Create new rule
        result = await createRecurrenceRule(data)
      }

      if (result.error) {
        throw new Error(result.error)
      }

      if (result.data) {
        onSubmit(result.data as TaskRecurrenceRule)
        onClose()
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            {rule ? 'Edit Recurrence' : 'Make Task Recurring'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-slate-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          <TaskRecurrenceForm
            rule={rule}
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
