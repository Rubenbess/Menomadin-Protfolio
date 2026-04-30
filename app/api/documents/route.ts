import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('response' in auth) return auth.response
  const { supabase } = auth

  let body: { company_id?: unknown; file_url?: unknown; file_name?: unknown; type?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.company_id || typeof body.company_id !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid company_id' }, { status: 400 })
  }
  if (!body.file_url || typeof body.file_url !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid file_url' }, { status: 400 })
  }
  if (!body.file_name || typeof body.file_name !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid file_name' }, { status: 400 })
  }

  // Verify the target company exists before inserting
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('id', body.company_id)
    .maybeSingle()
  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 })
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { error } = await supabase.from('documents').insert({
    company_id: body.company_id,
    file_url: body.file_url,
    file_name: body.file_name,
    type: body.type ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
