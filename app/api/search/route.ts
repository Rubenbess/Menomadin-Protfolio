import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if ('response' in auth) return auth.response
  const { supabase } = auth

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  // ilike pattern — escape % and _ so user input can't match-all the table.
  const escaped = q.replace(/[\\%_]/g, m => `\\${m}`)
  const pattern = `%${escaped}%`

  // PostgREST .or() uses commas as condition separators, so a user query
  // containing a comma (or `()`/`.`) corrupts the filter. Split the OR into
  // two separate queries and merge results client-side instead.
  const [companies, contactsByName, contactsByEmail, pipeline] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, sector, status, logo_url')
      .ilike('name', pattern)
      .limit(5),
    supabase
      .from('contacts')
      .select('id, name, position, email')
      .ilike('name', pattern)
      .limit(5),
    supabase
      .from('contacts')
      .select('id, name, position, email')
      .ilike('email', pattern)
      .limit(5),
    supabase
      .from('pipeline')
      .select('id, name, sector, status')
      .ilike('name', pattern)
      .limit(5),
  ])

  // De-duplicate contacts by id when a row matched both name and email.
  const contactsById = new Map<string, { id: string; name: string; position: string | null; email: string | null }>()
  for (const c of [...(contactsByName.data ?? []), ...(contactsByEmail.data ?? [])]) {
    if (!contactsById.has(c.id)) contactsById.set(c.id, c)
  }
  const contactsMerged = [...contactsById.values()].slice(0, 5)

  const results = [
    ...(companies.data ?? []).map(c => ({
      type: 'company' as const,
      id: c.id,
      title: c.name,
      subtitle: [c.sector, c.status].filter(Boolean).join(' · '),
      href: `/companies/${c.id}`,
      logo: c.logo_url,
    })),
    ...contactsMerged.map(c => ({
      type: 'contact' as const,
      id: c.id,
      title: c.name,
      subtitle: [c.position, c.email].filter(Boolean).join(' · '),
      href: `/contacts`,
      logo: null,
    })),
    ...(pipeline.data ?? []).map(c => ({
      type: 'deal' as const,
      id: c.id,
      title: c.name,
      subtitle: [c.sector, c.status].filter(Boolean).join(' · '),
      href: `/pipeline`,
      logo: null,
    })),
  ]

  return NextResponse.json({ results })
}
