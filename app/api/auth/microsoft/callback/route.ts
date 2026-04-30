import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const NONCE_COOKIE = 'ms_oauth_nonce'

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

  // State is "nonce:user_id" — verify both the random nonce (from HttpOnly cookie)
  // and that the session matches the user_id embedded in state. This prevents:
  //   1. CSRF: nonce was never issued by this server for this browser
  //   2. Session hijack: session user must match the user who initiated the flow
  const colonIdx = stateParam.indexOf(':')
  const nonceFromState = colonIdx > -1 ? stateParam.slice(0, colonIdx) : ''
  const userIdFromState = colonIdx > -1 ? stateParam.slice(colonIdx + 1) : stateParam

  const nonceCookie = req.cookies.get(NONCE_COOKIE)?.value
  if (!nonceCookie || nonceCookie !== nonceFromState) {
    return NextResponse.redirect(
      new URL('/settings/email-scanner?error=oauth_state_mismatch', req.url)
    )
  }

  const ssoSupabase = await createServerSupabaseClient()
  const { data: { user: sessionUser } } = await ssoSupabase.auth.getUser()
  if (!sessionUser || sessionUser.id !== userIdFromState) {
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

  const successResponse = NextResponse.redirect(
    new URL('/settings/email-scanner?success=connected', req.url)
  )
  // Consume the nonce — marks it as used so it cannot be replayed
  successResponse.cookies.delete(NONCE_COOKIE)
  return successResponse
}
