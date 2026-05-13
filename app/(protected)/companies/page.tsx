import { createServerSupabaseClient } from '@/lib/supabase-server'
import CompaniesClient from './CompaniesClient'
import type { Company, Contact } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ strategy?: string }>
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { strategy } = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase.from('companies').select('*').order('name')
  if (strategy) query = query.eq('strategy', strategy)
  const { data: companies } = await query

  const ids = (companies ?? []).map((c: Company) => c.id)

  const [{ data: contacts }] = await (ids.length
    ? Promise.all([supabase.from('contacts').select('*').in('company_id', ids)])
    : Promise.resolve([{ data: [] }]))

  return (
    <CompaniesClient
      companies={(companies ?? []) as Company[]}
      contacts={(contacts ?? []) as Contact[]}
      strategyLabel={null}
    />
  )
}
