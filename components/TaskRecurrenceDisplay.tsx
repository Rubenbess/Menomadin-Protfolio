'use client'

import { useState } from 'react'
import { Calendar, Edit2, Trash2, RotateCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import { deleteRecurrenceRule, generateNextRecurringTask } from '@/actions/task-recurrence'
import type { TaskRecurrenceRule } from '@/lib/types'

interface Props {
  rule: TaskRecurrenceRule
  taskId: string
  onRuleUpdated: () => Promise<void>
  onEdit: () => void
}

export default function TaskRecurrenceDisplay({
  rule,
  taskId,
  onRuleUpdated,
  onEdit,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const getFrequencyLabel = (frequency: string, interval: number): string => {
    const freqMap: Record<string, string> = {
      daily: 'day',
      weekly: 'week',
      biweekly: 'week',
      monthly: 'month',
      quarterly: 'quarter',
      yearly: 'year',
    }
    const unit = freqMap[frequency] || frequency
    const pluralUnit = interval > 1 ? `${unit}s` : unit
    return `Every ${interval} ${pluralUnit}`
  }

  const getRecurrenceDisplay = (): string => {
    let text = getFrequencyLabel(rule.frequency, rule.interval)

    if (rule.frequency === 'weekly' && rule.day_of_week !== null) {
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][rule.day_of_week]
      text += ` on ${dayName}`
    } else if (rule.frequency === 'monthly' && rule.day_of_month !== null) {
      text += ` on day ${rule.day_of_month}`
    }

    return text
  }

  const handleDelete = async () => {
    if (!window.confirm('Deactivate this recurrence rule?')) return

    setIsDeleting(true)
    const result = await deleteRecurrenceRule(rule.id)

    if (!result.error) {
      await onRuleUpdated()
    }
    setIsDeleting(false)
  }

  const handleGenerateNow = async () => {
    setIsGenerating(true)
    const result = await generateNextRecurringTask(rule.id, taskId)

    if (!result.error) {
      await onRuleUpdated()
    }
    setIsGenerating(false)
  }

  const nextDate = new Date(rule.next_occurrence)
  const today = new Date()
  const daysUntil = Math.ceil(
    (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Recurring Task</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-slate-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
              title="Edit recurrence"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
              title="Deactivate recurrence"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Recurrence Info */}
        <div className="space-y-2">
          <p className="text-sm text-neutral-800 dark:text-neutral-300">
            {getRecurrenceDisplay()}
          </p>

          <div className="space-y-1">
            <p className="text-xs text-neutral-600 dark:text-neutral-500">
              Next task: <span className="font-medium">{nextDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}</span>
              {daysUntil === 0 && <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">Today</span>}
              {daysUntil > 0 && daysUntil <= 7 && <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">in {daysUntil} day{daysUntil > 1 ? 's' : ''}</span>}
            </p>

            {rule.last_generated && (
              <p className="text-xs text-neutral-600 dark:text-neutral-500">
                Last generated: {new Date(rule.last_generated).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        {/* Generate Now Button */}
        <Button
          size="sm"
          variant="secondary"
          onClick={handleGenerateNow}
          loading={isGenerating}
          className="w-full"
        >
          <RotateCw size={14} />
          Generate Next Task Now
        </Button>
      </div>
    </div>
  )
}
