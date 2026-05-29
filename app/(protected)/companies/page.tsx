import { createServerSupabaseClient } from '@/lib/supabase-server'
import CompaniesClient from './CompaniesClient'
import type { Company, Contact } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Narrow projections — CompaniesClient only reads these columns. Avoids
// hydrating logo bytes (when stored inline) and unused metadata into the
// initial server payload. Verified by grepping property accesses on the
// `companies`/`contacts` arrays passed to CompaniesClient.
const COMPANY_COLUMNS = 'id, name, sector, strategy, hq, status, description, entry_stage, logo_url'
const CONTACT_COLUMNS = 'id, company_id, name, position'

interface Props {
  searchParams: Promise<{ strategy?: string }>
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { strategy } = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase.from('companies').select(COMPANY_COLUMNS).order('name')
  if (strategy) query = query.eq('strategy', strategy)
  const { data: companies, error: companiesError } = await query
  if (companiesError) throw new Error(companiesError.message)

  const ids = (companies ?? []).map((c: { id: string }) => c.id)

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
