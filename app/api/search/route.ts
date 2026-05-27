import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if ('response' in auth) return auth.response
  const { supabase } = auth

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [], hasMore: false })

  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? 8)
  const limit = Math.min(Math.max(limitParam, 1), 20)
  // Fetch one extra row per category to detect whether more results exist
  const fetchLimit = limit + 1

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
      .limit(fetchLimit),
    supabase
      .from('contacts')
      .select('id, name, position, email')
      .ilike('name', pattern)
      .limit(fetchLimit),
    supabase
      .from('contacts')
      .select('id, name, position, email')
      .ilike('email', pattern)
      .limit(fetchLimit),
    supabase
      .from('pipeline')
      .select('id, name, sector, status')
      .ilike('name', pattern)
      .limit(fetchLimit),
  ])

  // De-duplicate contacts by id when a row matched both name and email.
  const contactsById = new Map<string, { id: string; name: string; position: string | null; email: string | null }>()
  for (const c of [...(contactsByName.data ?? []), ...(contactsByEmail.data ?? [])]) {
    if (!contactsById.has(c.id)) contactsById.set(c.id, c)
  }
  const allContacts = [...contactsById.values()]

  // Trim to requested limit and record whether there were more rows
  const companiesRows  = (companies.data ?? []).slice(0, limit)
  const contactsRows   = allContacts.slice(0, limit)
  const pipelineRows   = (pipeline.data ?? []).slice(0, limit)
  const hasMore =
    (companies.data ?? []).length > limit ||
    allContacts.length > limit ||
    (pipeline.data ?? []).length > limit

  const results = [
    ...companiesRows.map(c => ({
      type: 'company' as const,
      id: c.id,
      title: c.name,
      subtitle: [c.sector, c.status].filter(Boolean).join(' · '),
      href: `/companies/${c.id}`,
      logo: c.logo_url,
    })),
    ...contactsRows.map(c => ({
      type: 'contact' as const,
      id: c.id,
      title: c.name,
      subtitle: [c.position, c.email].filter(Boolean).join(' · '),
      href: `/contacts`,
      logo: null,
    })),
    ...pipelineRows.map(c => ({
      type: 'deal' as const,
      id: c.id,
      title: c.name,
      subtitle: [c.sector, c.status].filter(Boolean).join(' · '),
      href: `/pipeline`,
      logo: null,
    })),
  ]

  return NextResponse.json({ results, hasMore })
}
