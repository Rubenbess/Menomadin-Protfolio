'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

interface PieChartData {
  name: string
  value: number
}

interface BarChartData {
  name: string
  invested: number
  value: number
}

interface PortfolioChartProps {
  data: PieChartData[]
  title: string
  type?: 'pie' | 'bar'
  colors?: string[]
  height?: number
}

const COLORS = ['#b8956a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function InvestmentsByStageChart({ data, height = 300 }: { data: PieChartData[]; height?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
        Investments by Stage
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: $${(value / 1_000_000).toFixed(1)}M`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => `$${(value / 1_000_000).toFixed(2)}M`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SectorDistributionChart({ data, height = 300 }: { data: any[]; height?: number }) {
  const chartData = data.map(sector => ({
    name: sector.sector,
    invested: sector.invested,
    value: sector.currentValue,
  }))

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
        Sector Distribution (Invested vs Current Value)
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            formatter={(value: any) => `$${(value / 1_000_000).toFixed(2)}M`}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar dataKey="invested" fill="#b8956a" name="Invested" />
          <Bar dataKey="value" fill="#3b82f6" name="Current Value" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PerformanceChart({ data, height = 300 }: { data: any[]; height?: number }) {
  const chartData = data.map(company => ({
    name: company.name.substring(0, 15),
    moic: company.moic,
  }))

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
        Company Performance (MOIC)
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
          <YAxis stroke="#94a3b8" />
          <Tooltip formatter={(value: any) => value.toFixed(2) + 'x'} />
          <Bar
            dataKey="moic"
            fill="#3b82f6"
            name="MOIC"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
