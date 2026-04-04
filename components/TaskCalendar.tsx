'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TaskStatusBadge from '@/components/ui/TaskStatusBadge'
import type { TaskWithRelations } from '@/lib/types'

interface Props {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
}

export default function TaskCalendar({ tasks, onTaskClick }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get first day of month and number of days
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>()

    tasks.forEach(task => {
      if (task.due_date) {
        const dateStr = task.due_date.split('T')[0]
        if (!map.has(dateStr)) {
          map.set(dateStr, [])
        }
        map.get(dateStr)!.push(task)
      }
    })

    return map
  }, [tasks])

  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return tasksByDate.get(dateStr) || []
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }

  const isOverdue = (day: number) => {
    const taskDate = new Date(year, month, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return taskDate < today
  }

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Create calendar grid
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm dark:shadow-md border border-neutral-200 dark:border-neutral-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="p-2 text-center text-xs font-semibold text-neutral-600 dark:text-neutral-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const dayTasks = day ? getTasksForDay(day) : []
          const today = isToday(day || 0)
          const overdue = day && isOverdue(day)

          return (
            <div
              key={index}
              className={`min-h-24 p-2 rounded-lg border transition-colors ${
                day === null
                  ? 'bg-neutral-50 dark:bg-neutral-800/50 border-transparent'
                  : today
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : overdue
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              {day && (
                <>
                  <p
                    className={`text-xs font-semibold mb-1 ${
                      today
                        ? 'text-primary-700 dark:text-primary-400'
                        : overdue
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {day}
                  </p>

                  {dayTasks.length > 0 && (
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map(task => (
                        <button
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className="w-full text-left block p-1 rounded text-xs font-medium text-white bg-neutral-600 dark:bg-neutral-700 hover:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors truncate"
                        >
                          {task.title}
                        </button>
                      ))}
                      {dayTasks.length > 2 && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-500 px-1">
                          +{dayTasks.length - 2} more
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-6 text-xs text-neutral-600 dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary-500" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Overdue</span>
        </div>
      </div>
    </div>
  )
}
