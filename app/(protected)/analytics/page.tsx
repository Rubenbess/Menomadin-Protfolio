import { Breadcrumbs } from '@/components/Breadcrumbs'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { BarChart3 } from 'lucide-react'
import AnalyticsClient from './AnalyticsClient'

export const metadata = {
  title: 'Analytics | Portfolio',
  description: 'Portfolio analytics and performance metrics',
}

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  const [companiesResult, investmentsResult] = await Promise.all([
    supabase.from('companies').select('*'),
    supabase.from('investments').select('*'),
  ])

  const companies = companiesResult.data || []
  const investments = investmentsResult.data || []

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Analytics', href: '/analytics' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-amber-700 dark:text-amber-600" size={24} />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Analytics
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Portfolio performance and investment metrics
          </p>
        </div>
      </div>

      <Breadcrumbs items={breadcrumbs} />

      <AnalyticsClient companies={companies} investments={investments} />
    </div>
  )
}
