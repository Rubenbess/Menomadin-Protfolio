'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { DocumentCategory } from '@/lib/types'

interface GlobalDocumentData {
  company_id: string | null
  file_url: string
  file_name: string
  category: DocumentCategory
  doc_date: string | null
  notes: string | null
}

export async function createGlobalDocument(data: GlobalDocumentData) {
  const supabase = await createServerSupabaseClient()
  const { data: row, error } = await supabase.from('global_documents').insert(data).select('id').single()
  if (error) return { error: error.message, id: null }
  revalidatePath('/documents')
  return { error: null, id: row.id as string }
}

export async function updateGlobalDocument(id: string, data: Partial<GlobalDocumentData>) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('global_documents').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/documents')
  return { error: null }
}

export async function deleteGlobalDocument(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('global_documents').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/documents')
  return { error: null }
}
