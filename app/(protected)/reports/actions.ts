'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function uploadDealReport(reportDate: string, content: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('deal_reports')
    .upsert({ report_date: reportDate, content }, { onConflict: 'report_date' })

  if (error) throw new Error(error.message)

  revalidatePath('/reports')
}

export async function getDealReportRecipients() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('deal_report_recipients')
    .select('id, email, name')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function addDealReportRecipient(email: string, name: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('deal_report_recipients')
    .insert({ email: email.trim().toLowerCase(), name: name.trim() || null })
  if (error) return { error: error.message }
  revalidatePath('/reports')
  return {}
}

export async function removeDealReportRecipient(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('deal_report_recipients')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/reports')
  return {}
}
