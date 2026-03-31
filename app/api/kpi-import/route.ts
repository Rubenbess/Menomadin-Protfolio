import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company_id, date, arr, revenue, burn_rate, cash_runway, headcount, gross_margin } = body

    if (!company_id || !date) {
      return NextResponse.json({ error: 'company_id and date are required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.from('company_kpis').insert({
      company_id,
      date,
      arr:          arr ?? null,
      revenue:      revenue ?? null,
      burn_rate:    burn_rate ?? null,
      cash_runway:  cash_runway ?? null,
      headcount:    headcount ?? null,
      gross_margin: gross_margin ?? null,
      run_rate:     null,
      notes:        null,
      custom_kpis:  null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
