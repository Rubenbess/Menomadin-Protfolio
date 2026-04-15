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
