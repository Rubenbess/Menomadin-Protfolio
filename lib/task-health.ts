import type { TaskWithRelations } from '@/lib/types'

export type HealthScore = 'critical' | 'poor' | 'warning' | 'good' | 'excellent'

export interface TaskHealthMetrics {
  score: number // 0-100
  level: HealthScore
  factors: {
    overdue: { score: number; weight: number; label: string }
    priority: { score: number; weight: number; label: string }
    assignees: { score: number; weight: number; label: string }
    dueDate: { score: number; weight: number; label: string }
    progress: { score: number; weight: number; label: string }
  }
  recommendations: string[]
}

export function calculateTaskHealth(task: TaskWithRelations): TaskHealthMetrics {
  const factors = {
    overdue: evaluateOverdue(task),
    priority: evaluatePriority(task),
    assignees: evaluateAssignees(task),
    dueDate: evaluateDueDate(task),
    progress: evaluateProgress(task),
  }

  // Calculate weighted score
  const totalWeight = Object.values(factors).reduce((sum, f) => sum + f.weight, 0)
  const weightedSum = Object.values(factors).reduce((sum, f) => sum + f.score * f.weight, 0)
  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 50

  const level = getHealthLevel(score)
  const recommendations = getRecommendations(task, factors)

  return {
    score,
    level,
    factors,
    recommendations,
  }
}

function evaluateOverdue(task: TaskWithRelations): {
  score: number
  weight: number
  label: string
} {
  if (task.status === 'Done' || task.status === 'Cancelled') {
    return { score: 100, weight: 0, label: 'Task completed or cancelled' }
  }

  if (!task.due_date) {
    return { score: 70, weight: 15, label: 'No due date set' }
  }

  const dueDate = new Date(task.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)

  if (dueDate < today) {
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    const score = Math.max(0, 100 - daysOverdue * 15) // Decrease by 15 points per day overdue
    return {
      score,
      weight: 25,
      label: `Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
    }
  }

  return { score: 100, weight: 10, label: 'Not overdue' }
}

function evaluatePriority(task: TaskWithRelations): {
  score: number
  weight: number
  label: string
} {
  // High priority items without clear progress should impact health
  if (task.priority === 'high' && task.status === 'To do') {
    return {
      score: 50,
      weight: 20,
      label: 'High priority task not started',
    }
  }

  if (task.priority === 'high' && task.status === 'In progress') {
    return { score: 80, weight: 15, label: 'High priority in progress' }
  }

  if (task.priority === 'low') {
    return { score: 100, weight: 5, label: 'Low priority' }
  }

  return { score: 90, weight: 10, label: 'Medium priority' }
}

function evaluateAssignees(task: TaskWithRelations): {
  score: number
  weight: number
  label: string
} {
  if (!task.assignees || task.assignees.length === 0) {
    return {
      score: 30,
      weight: 20,
      label: 'Not assigned',
    }
  }

  if (task.assignees.length > 3) {
    return {
      score: 70,
      weight: 10,
      label: `Assigned to ${task.assignees.length} people`,
    }
  }

  return {
    score: 100,
    weight: 10,
    label: `Assigned to ${task.assignees.length} person${task.assignees.length > 1 ? 's' : ''}`,
  }
}

function evaluateDueDate(task: TaskWithRelations): {
  score: number
  weight: number
  label: string
} {
  if (!task.due_date) {
    return { score: 50, weight: 10, label: 'No due date' }
  }

  const dueDate = new Date(task.due_date)
  const today = new Date()
  const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilDue < 0) {
    return { score: 30, weight: 5, label: 'Past due' }
  }

  if (daysUntilDue === 0) {
    return { score: 50, weight: 15, label: 'Due today' }
  }

  if (daysUntilDue <= 3) {
    return {
      score: 70,
      weight: 15,
      label: `Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
    }
  }

  if (daysUntilDue <= 7) {
    return { score: 85, weight: 10, label: `Due in ${daysUntilDue} days` }
  }

  return { score: 100, weight: 5, label: `Due in ${daysUntilDue} days` }
}

function evaluateProgress(task: TaskWithRelations): {
  score: number
  weight: number
  label: string
} {
  switch (task.status) {
    case 'Done':
      return { score: 100, weight: 0, label: 'Completed' }
    case 'Cancelled':
      return { score: 100, weight: 0, label: 'Cancelled' }
    case 'In progress':
      return { score: 80, weight: 15, label: 'In progress' }
    case 'Waiting':
      return { score: 60, weight: 10, label: 'Waiting on something' }
    case 'To do':
      return { score: 40, weight: 20, label: 'Not started' }
    default:
      return { score: 50, weight: 10, label: 'Unknown status' }
  }
}

function getHealthLevel(score: number): HealthScore {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'warning'
  if (score >= 30) return 'poor'
  return 'critical'
}

function getRecommendations(
  task: TaskWithRelations,
  factors: TaskHealthMetrics['factors']
): string[] {
  const recommendations: string[] = []

  // Check if overdue
  if (task.due_date) {
    const dueDate = new Date(task.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dueDate < today) {
      recommendations.push('This task is overdue. Consider prioritizing it or adjusting the due date.')
    }
  }

  // Check if not assigned
  if (!task.assignees || task.assignees.length === 0) {
    recommendations.push('Assign this task to someone to clarify ownership and accountability.')
  }

  // Check if high priority and not started
  if (task.priority === 'high' && task.status === 'To do') {
    recommendations.push('This is a high-priority task that hasn\'t been started. Consider beginning work soon.')
  }

  // Check if no due date
  if (!task.due_date && task.status !== 'Done' && task.status !== 'Cancelled') {
    recommendations.push('Set a due date to establish a clear deadline and improve task tracking.')
  }

  // Check if waiting
  if (task.status === 'Waiting') {
    recommendations.push('This task is waiting. Consider adding a comment about what it\'s waiting for.')
  }

  // Check if too many assignees
  if (task.assignees && task.assignees.length > 3) {
    recommendations.push(
      'This task has many assignees. Consider simplifying ownership to 1-2 people.'
    )
  }

  return recommendations
}

export function getHealthColor(level: HealthScore): string {
  switch (level) {
    case 'excellent':
      return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
    case 'good':
      return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
    case 'warning':
      return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
    case 'poor':
      return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
    case 'critical':
      return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
  }
}

export function getHealthIcon(level: HealthScore): string {
  switch (level) {
    case 'excellent':
      return '✅'
    case 'good':
      return '👍'
    case 'warning':
      return '⚠️'
    case 'poor':
      return '❌'
    case 'critical':
      return '🚨'
  }
}
