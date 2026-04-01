import { getStatusColor } from '@/lib/task-utils'
import type { TaskStatus } from '@/lib/types'

interface Props {
  status: TaskStatus
  size?: 'sm' | 'md'
}

export default function TaskStatusBadge({ status, size = 'md' }: Props) {
  const colorClass = getStatusColor(status)

  const classes = {
    sm: 'px-2 py-1 text-xs rounded border',
    md: 'px-3 py-1.5 text-sm rounded-lg border',
  }

  return (
    <span className={`${classes[size]} font-medium border ${colorClass}`}>
      {status}
    </span>
  )
}
