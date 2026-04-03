import type { TaskAssignee } from '@/lib/types'

interface Props {
  assignees: TaskAssignee[]
  maxDisplay?: number
}

export default function TaskAssigneesStack({ assignees, maxDisplay = 3 }: Props) {
  const displayed = assignees.slice(0, maxDisplay)
  const remaining = assignees.length - displayed.length

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {displayed.map(assignee => (
          <div
            key={assignee.id}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-neutral-700"
            style={{ backgroundColor: assignee.team_member?.color || '#94a3b8' }}
            title={assignee.team_member?.name}
          >
            {assignee.team_member?.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <span className="text-xs text-neutral-700 dark:text-neutral-500 font-medium">
          +{remaining}
        </span>
      )}
    </div>
  )
}
