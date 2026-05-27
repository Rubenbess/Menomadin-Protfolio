import { createServerSupabaseClient } from '@/lib/supabase-server'
import DocumentsVaultClient from './DocumentsVaultClient'
import type { GlobalDocument, Company } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const supabase = await createServerSupabaseClient()

  const [docsRes, companiesRes] = await Promise.all([
    supabase.from('global_documents').select('*').limit(500).order('created_at', { ascending: false }),
    supabase.from('companies').select('id, name').limit(500).order('name'),
  ])

  // Surface query failures explicitly. Without this, an RLS/connectivity error
  // renders an empty vault that the operator cannot distinguish from "zero
  // documents uploaded" — a meaningful difference on a financial-records page.
  if (docsRes.error || companiesRes.error) {
    const msg = docsRes.error?.message ?? companiesRes.error?.message ?? 'Unknown error'
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p className="font-semibold mb-1">Couldn&apos;t load documents</p>
          <p className="text-xs">{msg}</p>
        </div>
      </div>
    )
  }

  return (
    <DocumentsVaultClient
      documents={(docsRes.data ?? []) as GlobalDocument[]}
      companies={(companiesRes.data ?? []) as Pick<Company, 'id' | 'name'>[]}
    />
  )
}
