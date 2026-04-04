import type { TaskWithRelations, TaskStatus, TaskPriority } from '@/lib/types'

export interface TaskMetrics {
  total: number
  completed: number
  completionRate: number
  overdue: number
  dueToday: number
  dueThisWeek: number
  avgTimeToComplete: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<TaskPriority, number>
  completionTrend: Array<{ date: string; count: number }>
  avgTimeByPriority: Record<TaskPriority, number>
}

export function calculateTaskMetrics(tasks: TaskWithRelations[], dateRangeStart?: Date, dateRangeEnd?: Date): TaskMetrics {
  // Filter by date range if provided
  let filteredTasks = tasks
  if (dateRangeStart) {
    filteredTasks = tasks.filter(t => new Date(t.created_at) >= dateRangeStart)
  }
  if (dateRangeEnd) {
    filteredTasks = filteredTasks.filter(t => new Date(t.created_at) <= dateRangeEnd)
  }

  const completed = filteredTasks.filter(t => t.status === 'Done').length
  const completionRate = filteredTasks.length > 0 ? Math.round((completed / filteredTasks.length) * 100) : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdue = filteredTasks.filter(t => {
    if (!t.due_date || t.status === 'Done' || t.status === 'Cancelled') return false
    const dueDate = new Date(t.due_date)
    return dueDate < today
  }).length

  const dueToday = filteredTasks.filter(t => {
    if (!t.due_date || t.status === 'Done' || t.status === 'Cancelled') return false
    const dueDate = new Date(t.due_date)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() === today.getTime()
  }).length

  const thisWeekEnd = new Date(today)
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7)
  const dueThisWeek = filteredTasks.filter(t => {
    if (!t.due_date || t.status === 'Done' || t.status === 'Cancelled') return false
    const dueDate = new Date(t.due_date)
    return dueDate >= today && dueDate < thisWeekEnd
  }).length

  // Calculate average time to complete
  const completedTasks = filteredTasks.filter(t => t.status === 'Done' && t.completed_at && t.created_at)
  const avgTimeToComplete = completedTasks.length > 0
    ? Math.round(
      completedTasks.reduce((sum, t) => {
        const createdDate = new Date(t.created_at).getTime()
        const completedDate = new Date(t.completed_at!).getTime()
        return sum + (completedDate - createdDate) / (1000 * 60 * 60 * 24)
      }, 0) / completedTasks.length
    )
    : 0

  // Count by status
  const byStatus = {
    'To do': filteredTasks.filter(t => t.status === 'To do').length,
    'In progress': filteredTasks.filter(t => t.status === 'In progress').length,
    'Waiting': filteredTasks.filter(t => t.status === 'Waiting').length,
    'Done': filteredTasks.filter(t => t.status === 'Done').length,
    'Cancelled': filteredTasks.filter(t => t.status === 'Cancelled').length,
  } as Record<TaskStatus, number>

  // Count by priority
  const byPriority = {
    'high': filteredTasks.filter(t => t.priority === 'high').length,
    'medium': filteredTasks.filter(t => t.priority === 'medium').length,
    'low': filteredTasks.filter(t => t.priority === 'low').length,
  } as Record<TaskPriority, number>

  // Completion trend (tasks completed per day, last 30 days)
  const completionTrend: Array<{ date: string; count: number }> = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const countForDate = filteredTasks.filter(t => {
      if (t.status !== 'Done' || !t.completed_at) return false
      const completedDate = new Date(t.completed_at).toISOString().split('T')[0]
      return completedDate === dateStr
    }).length

    if (completionTrend.length === 0 || countForDate > 0 || completionTrend[completionTrend.length - 1].count > 0) {
      completionTrend.push({ date: dateStr, count: countForDate })
    }
  }

  // Average time by priority
  const avgTimeByPriority: Record<TaskPriority, number> = { high: 0, medium: 0, low: 0 }
  for (const priority of ['high', 'medium', 'low'] as const) {
    const priorityCompleted = completedTasks.filter(t => t.priority === priority)
    if (priorityCompleted.length > 0) {
      avgTimeByPriority[priority] = Math.round(
        priorityCompleted.reduce((sum, t) => {
          const createdDate = new Date(t.created_at).getTime()
          const completedDate = new Date(t.completed_at!).getTime()
          return sum + (completedDate - createdDate) / (1000 * 60 * 60 * 24)
        }, 0) / priorityCompleted.length
      )
    }
  }

  return {
    total: filteredTasks.length,
    completed,
    completionRate,
    overdue,
    dueToday,
    dueThisWeek,
    avgTimeToComplete,
    byStatus,
    byPriority,
    completionTrend,
    avgTimeByPriority,
  }
}

export function getTasksByDateRange(
  tasks: TaskWithRelations[],
  startDate: Date,
  endDate: Date
): TaskWithRelations[] {
  return tasks.filter(t => {
    const created = new Date(t.created_at)
    return created >= startDate && created <= endDate
  })
}

export function getTasksByStatus(tasks: TaskWithRelations[], status: TaskStatus): TaskWithRelations[] {
  return tasks.filter(t => t.status === status)
}

export function getTasksByPriority(tasks: TaskWithRelations[], priority: TaskPriority): TaskWithRelations[] {
  return tasks.filter(t => t.priority === priority)
}

export function getTasksByCompany(tasks: TaskWithRelations[], companyId: string): TaskWithRelations[] {
  return tasks.filter(t => t.company_id === companyId)
}
