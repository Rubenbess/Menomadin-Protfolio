import { createServerSupabaseClient } from '@/lib/supabase-server'
import NetworkClient from './NetworkClient'
import type { Company } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function NetworkPage() {
  const supabase = await createServerSupabaseClient()
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, sector, strategy, hq, status, logo_url, co_investors')
    .order('name')

  const companiesList = (companies ?? []) as Pick<
    Company,
    'id' | 'name' | 'sector' | 'strategy' | 'hq' | 'status' | 'logo_url' | 'co_investors'
  >[]

  // Build co-investor → companies map
  const map = new Map<string, typeof companiesList>()
  for (const co of companiesList) {
    for (const investor of co.co_investors ?? []) {
      const key = investor.trim()
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(co)
    }
  }

  const nodes = [...map.entries()]
    .map(([name, cos]) => ({ name, companies: cos }))
    .sort((a, b) => b.companies.length - a.companies.length)

  return <NetworkClient nodes={nodes} allCompanies={companiesList} />
}
