import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const NONCE_COOKIE = 'ms_oauth_nonce'
const NONCE_TTL_SECONDS = 600 // 10 minutes

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const clientId = process.env.MICROSOFT_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !appUrl) {
    return NextResponse.redirect(
      new URL('/settings/email-scanner?error=missing_config', req.url)
    )
  }

  // Generate a cryptographically random, single-use nonce.
  // We embed the user_id so the callback can verify both identity and nonce
  // without a server-side store — stored in an HttpOnly, SameSite=Lax cookie.
  const nonce = crypto.randomUUID()
  const state = `${nonce}:${user.id}`

  const redirectUri = `${appUrl}/api/auth/microsoft/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'offline_access Mail.Read User.Read',
    response_mode: 'query',
    state,
  })

  const response = NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
  )

  response.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: NONCE_TTL_SECONDS,
    path: '/',
  })

  return response
}
