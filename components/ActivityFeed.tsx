import { formatDistanceToNow } from 'date-fns'
import { Activity } from 'lucide-react'

interface ActivityItem {
  id: string
  entity_type: string
  entity_id: string
  actor_id: string
  action: 'created' | 'updated' | 'deleted'
  field_changed?: string
  old_value?: string
  new_value?: string
  created_at: string
  metadata?: Record<string, any>
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  actorNames?: Record<string, string>
  compact?: boolean
}

const ENTITY_LABELS: Record<string, string> = {
  company: 'Company',
  investment: 'Investment',
  contact: 'Contact',
  document: 'Document',
  task: 'Task',
  round: 'Round',
  safe: 'SAFE',
}

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  updated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  deleted: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

export function ActivityFeed({
  activities,
  actorNames = {},
  compact = false,
}: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No activity yet
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-${compact ? '2' : '4'}`}>
      {activities.map((activity) => {
        const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
          addSuffix: true,
        })
        const actorName = actorNames[activity.actor_id] || 'Unknown user'
        const entityLabel = ENTITY_LABELS[activity.entity_type] || activity.entity_type

        return (
          <div
            key={activity.id}
            className={`flex gap-3 ${compact ? 'py-2' : 'py-3'}`}
          >
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full ${
                activity.action === 'created' ? 'bg-emerald-500' :
                activity.action === 'updated' ? 'bg-blue-500' :
                'bg-red-500'
              }`} />
              <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-800 flex-1" />
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ACTION_COLORS[activity.action]}`}>
                  {activity.action}
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {entityLabel}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400">
                <span>{actorName}</span>
                <span>•</span>
                <span>{timeAgo}</span>
              </div>

              {activity.field_changed && (
                <div className="mt-2 text-xs space-y-1">
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium">{activity.field_changed}</span>:
                  </p>
                  <div className="flex gap-2 items-center pl-2">
                    {activity.old_value && (
                      <>
                        <span className="line-through text-slate-400">
                          {activity.old_value}
                        </span>
                        <span className="text-slate-400">→</span>
                      </>
                    )}
                    {activity.new_value && (
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {activity.new_value}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
