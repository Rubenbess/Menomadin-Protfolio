import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const oauthError = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (oauthError || !code || !stateParam) {
    return NextResponse.redirect(
      new URL('/settings/email-scanner?error=oauth_failed', req.url)
    )
  }

  // Defence in depth: the `state` parameter is the user_id passed through
  // Microsoft's OAuth flow (see /api/auth/microsoft/connect). On its own that's
  // not tamper-proof — anyone could craft a /connect equivalent with another
  // user's id as the state, finish the flow with their own Microsoft account,
  // and overwrite the victim's email_integration row. Verify the returning
  // request also carries the matching Supabase session so that hijack requires
  // the victim's session cookie as well.
  const ssoSupabase = await createServerSupabaseClient()
  const { data: { user: sessionUser } } = await ssoSupabase.auth.getUser()
  if (!sessionUser || sessionUser.id !== stateParam) {
    return NextResponse.redirect(
      new URL('/settings/email-scanner?error=oauth_state_mismatch', req.url)
    )
  }
  const userId = sessionUser.id

  const clientId = process.env.MICROSOFT_CLIENT_ID!
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/auth/microsoft/callback`

  // Exchange authorization code for tokens
  const tokenRes = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    }
  )

  const tokens = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!tokens?.access_token) {
    return NextResponse.redirect(
      new URL('/settings/email-scanner?error=token_failed', req.url)
    )
  }

  // Fetch the user's email address from Microsoft Graph
  const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const me = await meRes.json() as { mail?: string; userPrincipalName?: string }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.from('email_integrations').upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: new Date(Date.now() + ((tokens.expires_in ?? 3600) * 1000)).toISOString(),
      email: me.mail ?? me.userPrincipalName ?? null,
      last_scanned_at: null,
    },
    { onConflict: 'user_id' }
  )

  return NextResponse.redirect(
    new URL('/settings/email-scanner?success=connected', req.url)
  )
}
