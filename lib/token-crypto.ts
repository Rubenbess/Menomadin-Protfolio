/**
 * At-rest encryption for OAuth tokens stored in `email_integrations`.
 *
 * Format: `enc:v1:<base64iv>:<base64tag>:<base64ciphertext>` — packed into
 * the existing TEXT column so no schema migration is required to roll out.
 * The version prefix lets us evolve the format later without re-encrypting
 * everything in place.
 *
 * Backward compatibility:
 *   • If EMAIL_TOKEN_KEY is unset, encryptToken() returns the plaintext.
 *     This makes the encryption opt-in via env — setting the key encrypts
 *     all new writes; clearing it (don't!) reverts to plaintext.
 *   • decryptToken() detects the `enc:v1:` prefix and decrypts; rows
 *     without the prefix (legacy plaintext) are returned as-is. This means
 *     existing rows keep working until the user reconnects Outlook, at
 *     which point the callback re-encrypts them.
 *   • If a row IS encrypted but the key is unset (e.g. env var lost),
 *     decryption fails and returns null — the caller treats it as "no
 *     token", which forces a fresh OAuth flow. Better than crashing.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

const PREFIX = 'enc:v1:'
const ALGORITHM = 'aes-256-gcm'
const IV_LEN = 12   // GCM standard
const TAG_LEN = 16  // GCM auth tag

/**
 * Derives a 32-byte AES-256 key from the env var by SHA-256. Accepting any
 * length (passphrase or hex blob) avoids constraining how the operator stores
 * the secret in Vercel/Supabase env.
 */
function getKey(): Buffer | null {
  const raw = process.env.EMAIL_TOKEN_KEY
  if (!raw) return null
  return createHash('sha256').update(raw, 'utf8').digest()
}

/**
 * Encrypt a token for storage. When `EMAIL_TOKEN_KEY` is unset, returns the
 * plaintext unchanged so deployments without the secret don't break OAuth.
 * Returns null on null input so callers can pass `tokens.refresh_token ?? null`
 * directly.
 */
export function encryptToken(plain: string | null | undefined): string | null {
  if (plain == null) return null
  if (plain === '') return ''

  // Already encrypted — defensive no-op so callers can't accidentally double-wrap.
  if (plain.startsWith(PREFIX)) return plain

  const key = getKey()
  if (!key) {
    // Fall back to plaintext when the operator hasn't configured the key.
    // Surfaces as a one-time warning per cold start — not on every request.
    if (process.env.NODE_ENV !== 'test' && !warned) {
      console.warn('[token-crypto] EMAIL_TOKEN_KEY not set; OAuth tokens stored as plaintext')
      warned = true
    }
    return plain
  }

  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

let warned = false

/**
 * Decrypt a stored token. Returns the plaintext, or null when decryption
 * fails (corrupted blob, key mismatch, missing key with encrypted input).
 * Legacy plaintext rows (no `enc:v1:` prefix) pass through unchanged.
 */
export function decryptToken(stored: string | null | undefined): string | null {
  if (stored == null) return null
  if (stored === '') return ''
  if (!stored.startsWith(PREFIX)) return stored  // legacy plaintext

  const key = getKey()
  if (!key) {
    // Encrypted blob in DB but no key configured — can't recover, surface
    // as "no token" so the caller forces a fresh OAuth flow.
    console.warn('[token-crypto] Encrypted token in DB but EMAIL_TOKEN_KEY is unset')
    return null
  }

  const parts = stored.slice(PREFIX.length).split(':')
  if (parts.length !== 3) return null

  try {
    const iv = Buffer.from(parts[0], 'base64')
    const tag = Buffer.from(parts[1], 'base64')
    const ciphertext = Buffer.from(parts[2], 'base64')
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return null

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return plaintext.toString('utf8')
  } catch {
    return null
  }
}
