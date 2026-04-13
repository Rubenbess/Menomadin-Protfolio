import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — no auth required
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/updates/')

  // If env vars are missing, let the request through to show a meaningful error
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (!isPublic) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next({ request })
  }

  // Forward pathname so server components can read it via headers()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as never)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → send to login (except public routes)
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in but on login page → send to dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // MFA enforcement — skip checks on MFA, security setup, and profile pages
  // /profile must be exempt so new users can complete their profile without hitting a redirect loop
  const isMfaRoute =
    pathname.startsWith('/mfa') ||
    pathname.startsWith('/settings/security') ||
    pathname.startsWith('/profile')

  if (user && !isMfaRoute && !isPublic) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal) {
      // Has 2FA enrolled but not yet verified this session → verify
      if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        return NextResponse.redirect(new URL('/mfa/verify', request.url))
      }
      // No 2FA enrolled at all → force setup before accessing anything
      if (aal.nextLevel === 'aal1' && aal.currentLevel === 'aal1') {
        return NextResponse.redirect(new URL('/settings/security?required=1', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico)$).*)'],
}
