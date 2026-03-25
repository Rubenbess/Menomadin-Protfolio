import { createServerSupabaseClient } from '@/lib/supabase-server'
import ReservesClient from './ReservesClient'
import type { Company, Reserve } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ReservesPage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: companies }, { data: reserves }] = await Promise.all([
    supabase.from('companies').select('id, name, sector, strategy, logo_url, status').order('name'),
    supabase.from('reserves').select('*'),
  ])

  return (
    <ReservesClient
      companies={(companies ?? []) as Pick<Company, 'id' | 'name' | 'sector' | 'strategy' | 'logo_url' | 'status'>[]}
      reserves={(reserves ?? []) as Reserve[]}
    />
  )
}
