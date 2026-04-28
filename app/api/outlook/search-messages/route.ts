import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAccessTokenForUser, searchMessages } from '@/lib/microsoft-graph'

/**
 * Returns recent inbox messages for the authenticated user, optionally
 * filtered by a Graph $search query. Used by the OutlookEmailPicker modal.
 *
 * Response: { connected: boolean, messages: GraphMessageSummary[] }
 *   - connected=false means the user hasn't completed OAuth yet —
 *     the UI should prompt them to connect at /settings/email-scanner.
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await getAccessTokenForUser(user.id)
  if (!auth) {
    return NextResponse.json({ connected: false, messages: [] })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 25)

  const messages = await searchMessages(auth.token, q, limit)
  return NextResponse.json({ connected: true, messages })
}
