import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from './supabase-server'

/**
 * Defence-in-depth auth gate for /api routes that touch user data.
 *
 * RLS policies are the primary guarantee, but enforcing the session here means
 * unauthenticated callers receive an explicit 401 before any DB call runs and
 * before any external API (Anthropic, Resend) is invoked. Always preferred over
 * relying solely on RLS.
 *
 * Returns either an authenticated `{ user, supabase }` pair or a `NextResponse`
 * the caller should return immediately.
 */
export async function requireAuth(): Promise<
  { user: User; supabase: SupabaseClient } | { response: NextResponse }
> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, supabase }
}

/**
 * Cron secret check that fails closed when CRON_SECRET is unset, instead of
 * matching `Bearer undefined`. Vercel cron passes the secret as an Authorization
 * header per the platform contract.
 *
 * ROTATION: Rotate CRON_SECRET in Vercel env vars every 90 days.
 * Steps: generate a new secret → update it in Vercel → redeploy → verify
 * cron jobs fire correctly. The old secret stops working immediately after
 * the env var is updated and the deployment completes.
 */
export function requireCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server' },
      { status: 503 },
    )
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
