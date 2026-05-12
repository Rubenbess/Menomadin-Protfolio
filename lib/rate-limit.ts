/**
 * Minimal in-memory sliding-window rate limiter for outbound-email routes.
 *
 * Scope: this is a best-effort defence against a leaked bearer token being
 * used to spam outbound mail. It is per-process — Vercel's serverless model
 * means each cold instance has its own counter, so a determined attacker can
 * still amplify by exhausting concurrent instances. Move to Upstash/KV when
 * an attacker is realistic, not just theoretical.
 *
 * Usage:
 *   const limited = checkRateLimit('send-report', 10, 60_000)
 *   if (limited) return NextResponse.json({ error: limited }, { status: 429 })
 */

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

export function checkRateLimit(
  key: string,
  maxPerWindow: number,
  windowMs: number,
): string | null {
  const now = Date.now()
  const existing = windows.get(key)

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (existing.count >= maxPerWindow) {
    const retryInSec = Math.ceil((existing.resetAt - now) / 1000)
    return `Rate limit exceeded for "${key}" — retry in ${retryInSec}s.`
  }

  existing.count += 1
  return null
}
