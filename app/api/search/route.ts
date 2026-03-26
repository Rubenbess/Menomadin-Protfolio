import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const supabase = await createServerSupabaseClient()
  const pattern = `%${q}%`

  const [companies, contacts, pipeline] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, sector, status, logo_url')
      .ilike('name', pattern)
      .limit(5),
    supabase
      .from('contacts')
      .select('id, name, position, email')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
    supabase
      .from('pipeline')
      .select('id, name, sector, status')
      .ilike('name', pattern)
      .limit(5),
  ])

  const results = [
    ...(companies.data ?? []).map(c => ({
      type: 'company' as const,
      id: c.id,
      title: c.name,
      subtitle: [c.sector, c.status].filter(Boolean).join(' · '),
      href: `/companies/${c.id}`,
      logo: c.logo_url,
    })),
    ...(contacts.data ?? []).map(c => ({
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
