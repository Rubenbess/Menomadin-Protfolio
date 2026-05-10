import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Reads only the calling user's email_integrations row. Uses the user-context
// client — RLS on email_integrations (`user_id = auth.uid()`) is the perimeter,
// so a service-role client would only widen the blast radius if the auth check
// or query filter were ever bypassed.
export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('email_integrations')
    .select('email, last_scanned_at, created_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ integration: data })
}
