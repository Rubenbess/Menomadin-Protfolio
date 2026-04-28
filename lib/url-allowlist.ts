/**
 * Whether a URL points at our Supabase storage host. Used to gate server-side
 * `fetch(file_url)` calls so an authenticated user can't make our server pull
 * arbitrary URLs (SSRF: internal addresses, file://, attacker-controlled
 * endpoints that consume LLM credits).
 */
export function isAllowedFileUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  let supabaseHost: string
  try {
    supabaseHost = new URL(supabaseUrl).hostname
  } catch {
    return false
  }
  // Allow the project's Supabase host and any subdomain (storage uses the same project ref).
  return parsed.hostname === supabaseHost
}
