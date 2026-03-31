import { createServerSupabaseClient } from '@/lib/supabase-server'
import DocumentsVaultClient from './DocumentsVaultClient'
import type { GlobalDocument, Company } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const supabase = await createServerSupabaseClient()

  const [docsRes, companiesRes] = await Promise.all([
    supabase.from('global_documents').select('*').order('created_at', { ascending: false }),
    supabase.from('companies').select('id, name').order('name'),
  ])

  return (
    <DocumentsVaultClient
      documents={(docsRes.data ?? []) as GlobalDocument[]}
      companies={(companiesRes.data ?? []) as Pick<Company, 'id' | 'name'>[]}
    />
  )
}
