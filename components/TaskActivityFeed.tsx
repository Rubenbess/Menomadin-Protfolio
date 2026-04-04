'use client'

import { CheckCircle2, Clock, AlertCircle, Trash2, Users, Calendar, Flag } from 'lucide-react'
import type { TaskActivity, TeamMember } from '@/lib/types'

interface Props {
  activities: TaskActivity[]
  teamMembers: { id: string; name: string; color: string }[]
  maxItems?: number
}

export function TaskActivityFeed({ activities, teamMembers, maxItems = 10 }: Props) {
  const displayActivities = activities.slice(0, maxItems)

  const getActorName = (actorId: string) => {
    return teamMembers.find(m => m.id === actorId)?.name || 'Unknown'
  }

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'status_changed':
        return <Clock size={16} className="text-blue-500" />
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-500" />
      case 'cancelled':
        return <Trash2 size={16} className="text-red-500" />
      case 'assignee_added':
      case 'assignee_removed':
        return <Users size={16} className="text-purple-500" />
      case 'due_date_changed':
        return <Calendar size={16} className="text-orange-500" />
      case 'priority_changed':
        return <Flag size={16} className="text-yellow-500" />
      default:
        return <AlertCircle size={16} className="text-neutral-500" />
    }
  }

  const getActivityLabel = (action: TaskActivity) => {
    const actor = getActorName(action.actor_id)

    switch (action.action_type) {
      case 'status_changed':
        return `${actor} changed status from "${action.old_value}" to "${action.new_value}"`
      case 'completed':
        return `${actor} marked task as complete`
      case 'cancelled':
        return `${actor} cancelled task`
      case 'assignee_added':
        return `${actor} assigned to ${action.new_value}`
      case 'assignee_removed':
        return `${actor} removed ${action.old_value} from assignees`
      case 'due_date_changed':
        return `${actor} changed due date from ${action.old_value || 'none'} to ${action.new_value || 'none'}`
      case 'priority_changed':
        return `${actor} changed priority from ${action.old_value} to ${action.new_value}`
      default:
        return `${actor} updated task`
    }
  }

  if (displayActivities.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-neutral-500 dark:text-neutral-600">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayActivities.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          {/* Timeline connector */}
          <div className="flex flex-col items-center">
            <div className="p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              {getActivityIcon(activity.action_type)}
            </div>
            {index < displayActivities.length - 1 && (
              <div className="w-0.5 h-8 bg-neutral-200 dark:bg-neutral-700 mt-2" />
            )}
          </div>

          {/* Activity content */}
          <div className="flex-1 pb-3">
            <p className="text-sm text-neutral-900 dark:text-white">
              {getActivityLabel(activity)}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              {new Date(activity.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}

      {activities.length > maxItems && (
        <div className="pt-2 text-center">
          <p className="text-xs text-neutral-500 dark:text-neutral-600">
            +{activities.length - maxItems} more activities
          </p>
        </div>
      )}
    </div>
  )
}
