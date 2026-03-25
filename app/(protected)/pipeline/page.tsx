import { createServerSupabaseClient } from '@/lib/supabase-server'
import PipelineBoard from './PipelineBoard'
import type { PipelineEntry } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: stagesData }, { data: entriesData }] = await Promise.all([
    supabase.from('pipeline_stages').select('*').order('position', { ascending: true }),
    supabase.from('pipeline').select('*').order('created_at', { ascending: false }),
  ])

  const stages = stagesData ?? []
  const entries = (entriesData ?? []) as PipelineEntry[]

  return <PipelineBoard stages={stages} entries={entries} />
}
