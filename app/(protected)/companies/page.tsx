import { createServerSupabaseClient } from '@/lib/supabase-server'
import CompaniesClient from './CompaniesClient'
import type { Company, Contact } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Narrow projections — CompaniesClient only reads these columns. Avoids
// hydrating logo bytes (when stored inline) and unused metadata into the
// initial server payload. Verified by grepping property accesses on the
// `companies`/`contacts` arrays passed to CompaniesClient.
const COMPANY_COLUMNS = 'id, name, sector, strategy, hq, status, description, entry_stage, logo_url'
// Health columns come from supabase/migrations/20261011_company_health.sql.
const COMPANY_COLUMNS_WITH_HEALTH = 'id, name, sector, strategy, hq, status, description, entry_stage, logo_url, health, health_note'
const CONTACT_COLUMNS = 'id, company_id, name, position'

interface Props {
  searchParams: Promise<{ strategy?: string }>
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { strategy } = await searchParams
  const supabase = await createServerSupabaseClient()

  let healthQuery = supabase.from('companies').select(COMPANY_COLUMNS_WITH_HEALTH).order('name')
  if (strategy) healthQuery = healthQuery.eq('strategy', strategy)
  const withHealth = await healthQuery

  let companies: unknown[] | null = withHealth.data
  let companiesError: { message: string } | null = withHealth.error
  if (companiesError) {
    // Migration not applied yet: fall back to the base projection.
    let baseQuery = supabase.from('companies').select(COMPANY_COLUMNS).order('name')
    if (strategy) baseQuery = baseQuery.eq('strategy', strategy)
    const base = await baseQuery
    companies = base.data
    companiesError = base.error
  }
  if (companiesError) throw new Error(companiesError.message)

  const ids = ((companies ?? []) as { id: string }[]).map(c => c.id)

  const [{ data: contacts, error: contactsError }] = await (ids.length
    ? Promise.all([supabase.from('contacts').select(CONTACT_COLUMNS).in('company_id', ids).limit(500)])
    : Promise.resolve([{ data: [], error: null }]))
  if (contactsError) throw new Error(contactsError.message)

  return (
    <CompaniesClient
      companies={(companies ?? []) as Company[]}
      contacts={(contacts ?? []) as Contact[]}
    />
  )
}
