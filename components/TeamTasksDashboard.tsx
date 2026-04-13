'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Users, AlertCircle, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import type { TaskWithRelations, TeamMember } from '@/lib/types'

interface Props {
  tasks: TaskWithRelations[]
  teamMembers: TeamMember[]
}

export function TeamTasksDashboard({ tasks, teamMembers }: Props) {
  const teamStats = useMemo(() => {
    const stats = teamMembers.map(member => {
      const memberTasks = tasks.filter(t =>
        t.assignees?.some(a => a.assigned_to === member.id)
      )
      const active = memberTasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled').length
      const completed = memberTasks.filter(t => t.status === 'Done').length
      const overdue = memberTasks.filter(t => {
        if (!t.due_date || t.status === 'Done' || t.status === 'Cancelled') return false
        return new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0))
      }).length
      const completionRate = memberTasks.length > 0
        ? Math.round((completed / memberTasks.length) * 100)
        : 0

      return { member, total: memberTasks.length, active, completed, overdue, completionRate }
    })
    return stats.sort((a, b) => b.active - a.active)
  }, [tasks, teamMembers])

  const overallStats = {
    total: tasks.length,
    assigned: tasks.filter(t => t.assignees && t.assignees.length > 0).length,
    unassigned: tasks.filter(t => !t.assignees || t.assignees.length === 0).length,
    overdue: tasks.filter(t => {
      if (!t.due_date || t.status === 'Done' || t.status === 'Cancelled') return false
      return new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0))
    }).length,
  }

  if (teamMembers.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-600">No team members found</p>
      </div>
    )
  }

  const summaryCards = [
    { label: 'Total Tasks',  value: overallStats.total,      icon: '📋', color: 'bg-blue-50 dark:bg-blue-900/20',    href: '/tasks' },
    { label: 'Assigned',     value: overallStats.assigned,   icon: '✓',  color: 'bg-emerald-50 dark:bg-emerald-900/20', href: '/tasks' },
    { label: 'Unassigned',   value: overallStats.unassigned, icon: '❓', color: 'bg-amber-50 dark:bg-amber-900/20',  href: '/tasks' },
    { label: 'Overdue',      value: overallStats.overdue,    icon: '⚠️', color: 'bg-red-50 dark:bg-red-900/20',      href: '/tasks' },
  ]

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`${stat.color} rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-500 uppercase">{stat.label}</p>
              <span className="text-lg">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Team Member Distribution */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <Users size={16} />
          Team Workload
        </h3>

        {teamStats.length === 0 ? (
          <div className="p-6 text-center rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <p className="text-sm text-neutral-500 dark:text-neutral-600">No assigned tasks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamStats.map(stat => (
              <Link
                key={stat.member.id}
                href="/tasks"
                className="block p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
              >
                {/* Member info */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: stat.member.color }}
                    >
                      {(stat.member.initials || stat.member.name.slice(0, 2)).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white group-hover:text-primary-500 transition-colors">
                        {stat.member.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-500 capitalize">
                        {stat.member.job_title || stat.member.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-neutral-900 dark:text-white">{stat.total}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-600">tasks</p>
                    </div>
                    <ArrowRight size={14} className="text-neutral-300 dark:text-neutral-600 group-hover:text-primary-500 transition-colors" />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Active',  value: stat.active,    icon: <Clock size={14} className="text-blue-500" /> },
                    { label: 'Done',    value: stat.completed,  icon: <CheckCircle2 size={14} className="text-emerald-500" /> },
                    { label: 'Overdue', value: stat.overdue,    icon: <AlertCircle size={14} className="text-red-500" /> },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5 p-2 rounded bg-neutral-50 dark:bg-neutral-800/50">
                      {s.icon}
                      <div>
                        <p className="text-xs font-medium text-neutral-900 dark:text-white">{s.value}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-600">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Completion bar */}
                {stat.total > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-neutral-600 dark:text-neutral-500">Completion</p>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">{stat.completionRate}%</p>
                    </div>
                    <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
                        style={{ width: `${stat.completionRate}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-2">
        <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-500 uppercase">Insights</p>
        <ul className="space-y-1 text-xs text-neutral-700 dark:text-neutral-400">
          {teamStats[0] && (
            <li>📌 <strong>{teamStats[0].member.name}</strong> has the most active tasks ({teamStats[0].active})</li>
          )}
          {overallStats.overdue > 0 && (
            <li>⚠️ <strong>{overallStats.overdue}</strong> tasks are currently overdue</li>
          )}
          {overallStats.unassigned > 0 && (
            <li>❓ <strong>{overallStats.unassigned}</strong> tasks need to be assigned</li>
          )}
          {teamStats.length > 0 && (
            <li>
              ✓ Team completion rate is{' '}
              <strong>
                {Math.round(
                  (teamStats.reduce((a, b) => a + b.completed, 0) /
                    (teamStats.reduce((a, b) => a + b.total, 0) || 1)) * 100
                )}%
              </strong>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
