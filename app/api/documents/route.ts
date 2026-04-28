import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('response' in auth) return auth.response
  const { supabase } = auth

  const body = await req.json()

  const { error } = await supabase.from('documents').insert({
    company_id: body.company_id,
    file_url: body.file_url,
    file_name: body.file_name,
    type: body.type,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
