'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TaskMetrics } from '@/lib/task-analytics'

interface Props {
  metrics: TaskMetrics
}

export default function TaskCharts({ metrics }: Props) {
  const COLORS = {
    'To do': '#ef4444',
    'In progress': '#f59e0b',
    'Waiting': '#8b5cf6',
    'Done': '#10b981',
    'Cancelled': '#6b7280',
    'high': '#ef4444',
    'medium': '#f59e0b',
    'low': '#10b981',
  }

  const statusData = Object.entries(metrics.byStatus).map(([status, count]) => ({
    name: status,
    count,
  }))

  const priorityData = Object.entries(metrics.byPriority).map(([priority, count]) => ({
    name: priority.charAt(0).toUpperCase() + priority.slice(1),
    value: count,
  }))

  const avgTimeData = Object.entries(metrics.avgTimeByPriority).map(([priority, days]) => ({
    priority: priority.charAt(0).toUpperCase() + priority.slice(1),
    days,
  }))

  return (
    <div className="space-y-6">
      {/* Tasks by Status */}
      <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Tasks by Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
            Priority Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Time to Complete by Priority */}
        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
            Avg. Days to Complete by Priority
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={avgTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="priority" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="days" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Completion Trend */}
      <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
          Completion Trend (Last 30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.completionTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
              interval={Math.floor(metrics.completionTrend.length / 6) || 0}
            />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Tasks Completed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
