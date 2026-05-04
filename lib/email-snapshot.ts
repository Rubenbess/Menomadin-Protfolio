/**
 * Parse .eml / .msg files into a uniform snapshot shape that maps to
 * task_email_attachments columns. HTML is sanitized via DOMPurify.
 */

// All three packages are imported dynamically inside their respective
// functions so they are never resolved during Next.js build-time page-data
// collection. Static top-level imports caused ERR_REQUIRE_ESM because
// html-encoding-sniffer (a transitive dep of mailparser) CJS-requires an
// ESM-only file from @exodus/bytes.
import type { AddressObject } from 'mailparser'

// @kenjiuno/msgreader publishes the class on `default` AND nested in
// `.default.default` depending on how the bundler resolves CJS<->ESM. Walk
// the chain until we find the actual constructor.
type MsgReaderCtor = new (buf: ArrayBuffer) => { getFileData: () => unknown }
async function resolveMsgReader(): Promise<MsgReaderCtor> {
  const MsgReaderDefault = (await import('@kenjiuno/msgreader')).default
  let candidate: unknown = MsgReaderDefault
  for (let i = 0; i < 3; i++) {
    if (typeof candidate === 'function') return candidate as MsgReaderCtor
    if (candidate && typeof candidate === 'object' && 'default' in candidate) {
      candidate = (candidate as { default: unknown }).default
      continue
    }
    break
  }
  throw new Error(
    'Could not resolve @kenjiuno/msgreader constructor — got ' +
      typeof candidate
  )
}

export interface EmailSnapshot {
  subject: string | null
  from_name: string | null
  from_email: string | null
  to_recipients: { name: string | null; email: string | null }[]
  cc_recipients: { name: string | null; email: string | null }[]
  received_at: string | null
  body_html: string | null
  body_text: string | null
  body_preview: string | null
}

const PREVIEW_LEN = 200

function makePreview(text: string | null | undefined): string | null {
  if (!text) return null
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return null
  return clean.length > PREVIEW_LEN ? clean.slice(0, PREVIEW_LEN) + '…' : clean
}

/** Strip HTML to plaintext as a fallback when only HTML is available. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function sanitizeHtml(html: string): Promise<string> {
  const { default: DOMPurify } = await import('isomorphic-dompurify')
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
  })
}

// ─── From .eml file (mailparser) ────────────────────────────────────────────

function flattenAddresses(
  field: AddressObject | AddressObject[] | undefined
): { name: string | null; email: string | null }[] {
  if (!field) return []
  const list = Array.isArray(field) ? field : [field]
  const out: { name: string | null; email: string | null }[] = []
  for (const a of list) {
    for (const v of a.value ?? []) {
      out.push({
        name: v.name?.trim() || null,
        email: v.address?.trim() || null,
      })
    }
  }
  return out
}

export async function snapshotFromEml(buffer: Buffer): Promise<EmailSnapshot> {
  const { simpleParser } = await import('mailparser')
  const parsed = await simpleParser(buffer)
  const html = parsed.html || null
  const safeHtml = html ? await sanitizeHtml(html) : null
  const text = parsed.text || (html ? htmlToText(html) : null)

  const fromList = flattenAddresses(parsed.from)
  const toList = flattenAddresses(parsed.to)
  const ccList = flattenAddresses(parsed.cc)

  return cleanSnapshot({
    subject: parsed.subject ?? null,
    from_name: fromList[0]?.name ?? null,
    from_email: fromList[0]?.email ?? null,
    to_recipients: toList,
    cc_recipients: ccList,
    received_at: parsed.date ? parsed.date.toISOString() : null,
    body_html: safeHtml,
    body_text: text || null,
    body_preview: makePreview(text),
  })
}

/** Remove NULL bytes and bad-decode markers from every text field */
function cleanSnapshot(s: EmailSnapshot): EmailSnapshot {
  return {
    ...s,
    subject: stripBadChars(s.subject),
    from_name: stripBadChars(s.from_name),
    from_email: stripBadChars(s.from_email),
    to_recipients: s.to_recipients.map((r) => ({
      name: stripBadChars(r.name),
      email: stripBadChars(r.email),
    })),
    cc_recipients: s.cc_recipients.map((r) => ({
      name: stripBadChars(r.name),
      email: stripBadChars(r.email),
    })),
    body_html: stripBadChars(s.body_html),
    body_text: stripBadChars(s.body_text),
    body_preview: stripBadChars(s.body_preview),
  }
}

// ─── From .msg file (msgreader) ─────────────────────────────────────────────

interface MsgRecipient {
  name?: string
  smtpAddress?: string
  email?: string
}

interface MsgFileData {
  subject?: string
  senderName?: string
  senderEmail?: string
  senderSmtpAddress?: string
  recipients?: MsgRecipient[]
  body?: string
  bodyHtml?: string | Uint8Array
  messageDeliveryTime?: string
  clientSubmitTime?: string
}

/**
 * Strip NULL bytes, other C0 controls (except \t \n \r), and the U+FFFD
 * replacement character. PostgreSQL TEXT rejects embedded NULLs ("invalid
 * byte sequence for encoding UTF8"); the replacement char appears whenever
 * we decode using the wrong charset and DB tools choke on long strings of
 * them. Constructed via RegExp() so the source is pure ASCII and git
 * treats this file as text.
 */
const BAD_CHARS_RE = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\uFFFD]',
  'g'
)
function stripBadChars(s: string | null | undefined): string | null {
  if (!s) return s ?? null
  return s.replace(BAD_CHARS_RE, '')
}

function detectEncoding(value: Uint8Array): 'utf-16le' | 'utf-16be' | 'utf-8' {
  // BOM checks
  if (value.length >= 2 && value[0] === 0xff && value[1] === 0xfe) return 'utf-16le'
  if (value.length >= 2 && value[0] === 0xfe && value[1] === 0xff) return 'utf-16be'
  // Heuristic: if every other byte is 0x00 in the first ~32 bytes, it's UTF-16 LE
  // (common for Outlook-generated HTML).
  if (value.length > 32) {
    let zerosOdd = 0
    let zerosEven = 0
    for (let i = 0; i < 32; i++) {
      if (value[i] === 0) (i % 2 ? zerosOdd++ : zerosEven++)
    }
    if (zerosOdd > 12 && zerosEven < 4) return 'utf-16le'
    if (zerosEven > 12 && zerosOdd < 4) return 'utf-16be'
  }
  return 'utf-8'
}

function decodeMsgHtml(value: string | Uint8Array | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  try {
    const enc = detectEncoding(value)
    return new TextDecoder(enc, { fatal: false }).decode(value)
  } catch {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(value)
    } catch {
      return null
    }
  }
}

export async function snapshotFromMsg(buffer: Buffer): Promise<EmailSnapshot> {
  // msgreader expects ArrayBuffer; slice to detach from the underlying pool
  const ab = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer
  const Ctor = await resolveMsgReader()
  const reader = new Ctor(ab)
  const data = reader.getFileData() as MsgFileData

  const html = decodeMsgHtml(data.bodyHtml)
  const safeHtml = html ? await sanitizeHtml(html) : null
  const text = data.body ?? (html ? htmlToText(html) : null)

  const recipients = (data.recipients ?? []).map((r) => ({
    name: r.name?.trim() || null,
    email: (r.smtpAddress ?? r.email)?.trim() || null,
  }))

  const receivedRaw = data.messageDeliveryTime ?? data.clientSubmitTime
  let receivedAt: string | null = null
  if (receivedRaw) {
    const d = new Date(receivedRaw)
    if (!isNaN(d.getTime())) receivedAt = d.toISOString()
  }

  return cleanSnapshot({
    subject: data.subject ?? null,
    from_name: data.senderName ?? null,
    from_email: data.senderSmtpAddress ?? data.senderEmail ?? null,
    to_recipients: recipients,
    cc_recipients: [],
    received_at: receivedAt,
    body_html: safeHtml,
    body_text: text || null,
    body_preview: makePreview(text),
  })
}
