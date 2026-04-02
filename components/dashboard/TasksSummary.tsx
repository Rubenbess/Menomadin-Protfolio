import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MetricCard } from '@/components/ui/Card'
import { CheckSquare, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function TasksSummary() {
  const supabase = await createServerSupabaseClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')

  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-6 text-center">
        <CheckSquare size={32} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm text-slate-500 mb-4">No tasks yet</p>
        <Link href="/tasks" className="inline-flex items-center text-sm font-semibold text-primary-500 hover:text-primary-600">
          Create your first task →
        </Link>
      </div>
    )
  }

  // Calculate stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled').length,
    completed: tasks.filter(t => t.status === 'Done').length,
    overdue: tasks.filter(t => {
      if (!t.due_date || t.status === 'Done' || t.status === 'Cancelled') return false
      const dueDate = new Date(t.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < today
    }).length,
    dueToday: tasks.filter(t => {
      if (!t.due_date || t.status === 'Done' || t.status === 'Cancelled') return false
      const dueDate = new Date(t.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate.getTime() === today.getTime()
    }).length,
  }

  return (
    <div className="space-y-4 mb-6 md:mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <CheckSquare size={16} className="text-primary-500" />
          Tasks Overview
        </h2>
        <Link href="/tasks" className="text-xs font-medium text-primary-500 hover:text-primary-600">
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Total" value={stats.total.toString()} accent="violet" />
        <MetricCard label="Active" value={stats.active.toString()} accent="blue" />
        <MetricCard label="Completed" value={stats.completed.toString()} accent="emerald" />
        <MetricCard label="Due Today" value={stats.dueToday.toString()} accent={stats.dueToday > 0 ? 'amber' : 'violet'} />
        {stats.overdue > 0 && (
          <div className="bg-white rounded-2xl shadow-card ring-1 ring-black/[0.04] p-4 flex flex-col items-center justify-center border-t-2 border-red-500">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle size={14} className="text-red-600" />
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Overdue</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        )}
      </div>
    </div>
  )
}
