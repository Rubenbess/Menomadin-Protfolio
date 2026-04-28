import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  // Parse header — handle quoted fields
  function splitLine(line: string): string[] {
    const fields: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ; continue }
      if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    fields.push(cur.trim())
    return fields
  }

  const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map(line => {
    const vals = splitLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  }).filter(row => Object.values(row).some(v => v))
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('response' in auth) return auth.response
  const { supabase } = auth

  const type = req.nextUrl.searchParams.get('type') // 'contacts' | 'companies'
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (!rows.length) return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 400 })

  if (type === 'contacts') {
    const records = rows.map(r => ({
      name:         r.name || r.full_name || r.contact_name || '',
      position:     r.position || r.title || r.role || null,
      email:        r.email || r.email_address || null,
      phone:        r.phone || r.phone_number || r.mobile || null,
      address:      r.address || r.location || r.city || null,
      linkedin_url: r.linkedin || r.linkedin_url || null,
      notes:        r.notes || r.note || null,
    })).filter(r => r.name)

    const { data, error } = await supabase.from('contacts').insert(records).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ created: data?.length ?? 0 })
  }

  if (type === 'companies') {
    const records = rows.map(r => ({
      name:        r.name || r.company_name || r.company || '',
      sector:      r.sector || r.industry || null,
      hq:          r.hq || r.location || r.geography || r.country || null,
      strategy:    (['impact', 'venture'].includes(r.strategy?.toLowerCase()) ? r.strategy.toLowerCase() : 'venture') as 'impact' | 'venture',
      status:      (['active', 'exited', 'written-off', 'watchlist'].includes(r.status?.toLowerCase()) ? r.status.toLowerCase() : 'active') as 'active' | 'exited' | 'written-off' | 'watchlist',
      description: r.description || r.notes || null,
    })).filter(r => r.name)

    const { data, error } = await supabase.from('companies').insert(records).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ created: data?.length ?? 0 })
  }

  return NextResponse.json({ error: 'Invalid type. Use ?type=contacts or ?type=companies' }, { status: 400 })
}
