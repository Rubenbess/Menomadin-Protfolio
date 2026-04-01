import type { Task, TaskStatus, TaskStats } from './types'

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date) return false
  if (task.status === 'Done' || task.status === 'Cancelled') return false
  const dueDate = new Date(task.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dueDate < today
}

/**
 * Check if a task is due today
 */
export function isTaskDueToday(task: Task): boolean {
  if (!task.due_date) return false
  if (task.status === 'Done' || task.status === 'Cancelled') return false
  const dueDate = new Date(task.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate.getTime() === today.getTime()
}

/**
 * Check if a task is due this week
 */
export function isTaskDueThisWeek(task: Task): boolean {
  if (!task.due_date) return false
  if (task.status === 'Done' || task.status === 'Cancelled') return false
  const dueDate = new Date(task.due_date)
  const today = new Date()
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + 7)
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  endOfWeek.setHours(0, 0, 0, 0)
  return dueDate >= today && dueDate <= endOfWeek
}

/**
 * Get status color (for badges/indicators)
 */
export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    'To do': 'bg-slate-100 text-slate-700 border-slate-200',
    'In progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'Waiting': 'bg-amber-100 text-amber-700 border-amber-200',
    'Done': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Cancelled': 'bg-slate-200 text-slate-600 border-slate-300',
  }
  return colors[status]
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-emerald-100 text-emerald-700',
  }
  return colors[priority] || 'bg-slate-100 text-slate-700'
}

/**
 * Format due date for display
 */
export function formatDueDate(task: Task): string {
  if (!task.due_date) return ''
  const date = new Date(task.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  if (date < today) {
    const daysOverdue = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    return `${daysOverdue}d overdue`
  } else if (date.getTime() === today.getTime()) {
    return 'Today'
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow'
  } else if (date <= nextWeek) {
    const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return `In ${daysUntil}d`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

/**
 * Group tasks by status
 */
export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const grouped: Record<TaskStatus, Task[]> = {
    'To do': [],
    'In progress': [],
    'Waiting': [],
    'Done': [],
    'Cancelled': [],
  }

  tasks.forEach(task => {
    grouped[task.status].push(task)
  })

  return grouped
}

/**
 * Calculate task statistics
 */
export function calculateTaskStats(tasks: Task[]): TaskStats {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const stats: TaskStats = {
    total: tasks.length,
    overdue: 0,
    dueToday: 0,
    dueThisWeek: 0,
    completed: 0,
    byStatus: {
      'To do': 0,
      'In progress': 0,
      'Waiting': 0,
      'Done': 0,
      'Cancelled': 0,
    },
    byPriority: {
      high: 0,
      medium: 0,
      low: 0,
    },
  }

  tasks.forEach(task => {
    // Count by status
    stats.byStatus[task.status]++

    // Count by priority
    stats.byPriority[task.priority]++

    // Count completed
    if (task.status === 'Done') {
      stats.completed++
    }

    // Count overdue
    if (isTaskOverdue(task)) {
      stats.overdue++
    }

    // Count due today
    if (isTaskDueToday(task)) {
      stats.dueToday++
    }

    // Count due this week
    if (isTaskDueThisWeek(task)) {
      stats.dueThisWeek++
    }
  })

  return stats
}

/**
 * Filter tasks by various criteria
 */
export function filterTasks(
  tasks: Task[],
  filters: {
    status?: TaskStatus[]
    priority?: string[]
    assigneeId?: string
    companyId?: string
    dueBefore?: string
    dueAfter?: string
    includeCompleted?: boolean
  }
): Task[] {
  return tasks.filter(task => {
    // Filter by status
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(task.status)) return false
    }

    // Filter by priority
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(task.priority)) return false
    }

    // Filter by company
    if (filters.companyId && task.company_id !== filters.companyId) {
      return false
    }

    // Filter by due date range
    if (filters.dueBefore && task.due_date && task.due_date > filters.dueBefore) {
      return false
    }
    if (filters.dueAfter && task.due_date && task.due_date < filters.dueAfter) {
      return false
    }

    // Filter completed
    if (!filters.includeCompleted && task.status === 'Done') {
      return false
    }

    return true
  })
}

/**
 * Sort tasks by various criteria
 */
export function sortTasks(tasks: Task[], sortBy: 'due-date' | 'priority' | 'created' | 'updated' = 'due-date'): Task[] {
  const sorted = [...tasks]

  switch (sortBy) {
    case 'due-date':
      sorted.sort((a, b) => {
        // Tasks with no due date go to the end
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })
      break

    case 'priority':
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      sorted.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder])
      break

    case 'created':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      break

    case 'updated':
      sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      break
  }

  return sorted
}

/**
 * Calculate overdue warning badge text
 */
export function getOverdueWarning(task: Task): string | null {
  if (!isTaskOverdue(task)) return null
  const dueDate = new Date(task.due_date!)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  return `${daysOverdue}d overdue`
}

/**
 * Check if task is completing soon (in next 3 days)
 */
export function isTaskDueSoon(task: Task): boolean {
  if (!task.due_date) return false
  if (task.status === 'Done' || task.status === 'Cancelled') return false

  const dueDate = new Date(task.due_date)
  const today = new Date()
  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(today.getDate() + 3)

  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  threeDaysFromNow.setHours(0, 0, 0, 0)

  return dueDate >= today && dueDate <= threeDaysFromNow
}

/**
 * Get status progression (for workflow)
 */
export function getNextTaskStatus(currentStatus: TaskStatus): TaskStatus {
  const progression: Record<TaskStatus, TaskStatus> = {
    'To do': 'In progress',
    'In progress': 'Waiting',
    'Waiting': 'Done',
    'Done': 'Done',
    'Cancelled': 'Cancelled',
  }
  return progression[currentStatus]
}

/**
 * Validate task data
 */
export function validateTaskData(data: Partial<Task>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.title || !data.title.trim()) {
    errors.push('Title is required')
  }

  if (data.due_date && data.start_date) {
    if (new Date(data.due_date) < new Date(data.start_date)) {
      errors.push('Due date cannot be before start date')
    }
  }

  if (data.priority && !['high', 'medium', 'low'].includes(data.priority)) {
    errors.push('Invalid priority')
  }

  if (
    data.status &&
    !['To do', 'In progress', 'Waiting', 'Done', 'Cancelled'].includes(data.status)
  ) {
    errors.push('Invalid status')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
