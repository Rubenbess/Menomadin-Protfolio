import { createServerSupabaseClient } from '@/lib/supabase-server'
import PipelineBoard from './PipelineBoard'
import type { PipelineEntry } from '@/lib/types'
import { FULL_LIST_FETCH_LIMIT } from '@/lib/limits'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const supabase = await createServerSupabaseClient()

  const [stagesRes, entriesRes] = await Promise.all([
    supabase.from('pipeline_stages').select('*').order('position', { ascending: true }),
    supabase
      .from('pipeline')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(FULL_LIST_FETCH_LIMIT),
  ])

  // Surface a real error rather than rendering an empty board indistinguishable
  // from "no deals yet" — see daily health check M-014.
  if (stagesRes.error || entriesRes.error) {
    const msg = stagesRes.error?.message ?? entriesRes.error?.message ?? 'Unknown error'
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p className="font-semibold mb-1">Couldn&apos;t load the pipeline</p>
          <p className="text-xs">{msg}</p>
        </div>
      </div>
    )
  }

  const stages = stagesRes.data ?? []
  const entries = (entriesRes.data ?? []) as PipelineEntry[]

  return <PipelineBoard stages={stages} entries={entries} />
}
