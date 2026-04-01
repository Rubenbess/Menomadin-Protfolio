import { getPriorityColor } from '@/lib/task-utils'

interface Props {
  priority: string
  size?: 'sm' | 'md'
}

export default function TaskPriorityBadge({ priority, size = 'md' }: Props) {
  const colorClass = getPriorityColor(priority)
  const label = priority.charAt(0).toUpperCase() + priority.slice(1)

  const classes = {
    sm: 'px-2 py-1 text-xs rounded',
    md: 'px-3 py-1.5 text-sm rounded-lg',
  }

  return (
    <span className={`${classes[size]} font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
