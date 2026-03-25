import { createServerSupabaseClient } from '@/lib/supabase-server'
import CompaniesClient from './CompaniesClient'
import type { Company } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ strategy?: string }>
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { strategy } = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase.from('companies').select('*').order('name')
  if (strategy) query = query.eq('strategy', strategy)

  const { data } = await query

  const strategyLabel =
    strategy === 'impact'
      ? 'Menomadin Impact'
      : strategy === 'venture'
      ? 'Menomadin Ventures'
      : null

  return (
    <CompaniesClient
      companies={(data ?? []) as Company[]}
      strategyLabel={strategyLabel}
    />
  )
}
