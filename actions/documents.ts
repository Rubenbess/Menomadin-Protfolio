'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isAllowedFileUrl } from '@/lib/url-allowlist'

export async function saveDocument(data: {
  company_id: string
  file_url: string
  file_name: string
  type: string
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // file_url is later fetched server-side by /api/extract. Restrict it to our
  // Supabase storage host so this action can't be used to register an arbitrary
  // URL (SSRF / LLM-credit drain), matching the /api/documents route gate.
  if (!isAllowedFileUrl(data.file_url)) {
    return { error: 'File URL must point to the project storage host.' }
  }

  const { error } = await supabase.from('documents').insert(data)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteDocument(id: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
