import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'
import { requireAuth } from '@/lib/api-auth'
import { isAllowedFileUrl } from '@/lib/url-allowlist'

function parseClaudeJSON(text: string) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  return JSON.parse(cleaned)
}

// Per-type upload caps. Anthropic limits image payloads to ~5MB and document
// payloads to ~32MB; we cap below those to keep memory bounded and avoid
// downloading enormous files just to bounce them. Mirrors the pattern in
// app/api/import/route.ts:51-54.
const MAX_PDF_BYTES        = 20 * 1024 * 1024
const MAX_IMAGE_BYTES      = 5  * 1024 * 1024
const MAX_SPREADSHEET_BYTES = 10 * 1024 * 1024
const MAX_TEXT_BYTES       = 5  * 1024 * 1024

async function fetchWithSizeCap(url: string, maxBytes: number): Promise<{ ok: true; buffer: ArrayBuffer } | { ok: false; error: string; status: number }> {
  const res = await fetch(url)
  if (!res.ok) return { ok: false, error: 'Could not fetch file', status: 400 }

  // Trust the server's Content-Length when present — short-circuits before
  // we read the body. Some storage backends omit it on signed URLs.
  const declared = Number(res.headers.get('content-length') ?? 0)
  if (declared > maxBytes) {
    return { ok: false, error: `File too large (max ${(maxBytes / 1024 / 1024).toFixed(0)} MB)`, status: 413 }
  }

  const buffer = await res.arrayBuffer()
  if (buffer.byteLength > maxBytes) {
    return { ok: false, error: `File too large (max ${(maxBytes / 1024 / 1024).toFixed(0)} MB)`, status: 413 }
  }

  return { ok: true, buffer }
}

const SYSTEM_PROMPT = `You are a financial analyst assistant. Extract key financial and business metrics from the provided document.
Return ONLY raw valid JSON with no markdown formatting, no code fences, no explanation. The JSON must have this exact structure:
{
  "summary": "2-3 sentence description of the document and company stage",
  "metrics": {
    "metric_name": "value with unit"
  },
  "key_points": ["point 1", "point 2", "point 3"]
}
Look for: Revenue, ARR, MRR, Run Rate, Burn Rate, Cash Runway, Headcount, Gross Margin, NPS, Churn, Growth Rate, Total Raised, Valuation, Customer Count, and any other relevant KPIs.
For metrics, always include the unit/currency. Use "—" if a value is mentioned but unclear.`

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('response' in auth) return auth.response
  const { supabase } = auth

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const { document_id, file_url, file_name, file_type } = await req.json()
  if (!file_url || !document_id) {
    return NextResponse.json({ error: 'Missing document_id or file_url' }, { status: 400 })
  }
  if (!isAllowedFileUrl(file_url)) {
    return NextResponse.json({ error: 'file_url is not on the allowed storage host' }, { status: 400 })
  }

  const anthropic = new Anthropic({ apiKey })
  let extracted: { summary?: string; metrics?: Record<string, string>; key_points?: string[] } = {}

  const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
  type AllowedMediaType = typeof ALLOWED_MEDIA_TYPES[number]

  const ext = (file_name ?? '').split('.').pop()?.toLowerCase() ?? ''
  const isPdf    = file_type?.includes('pdf') || ext === 'pdf'
  const isImage  = file_type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
  const isExcel  = ['xlsx', 'xls', 'csv'].includes(ext)

  const sizeCap = isPdf ? MAX_PDF_BYTES
    : isImage ? MAX_IMAGE_BYTES
    : isExcel ? MAX_SPREADSHEET_BYTES
    : MAX_TEXT_BYTES

  const fetched = await fetchWithSizeCap(file_url, sizeCap)
  if (!fetched.ok) return NextResponse.json({ error: fetched.error }, { status: fetched.status })

  try {
    if (isPdf) {
      const base64 = Buffer.from(fetched.buffer).toString('base64')
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-6-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: 'Extract all financial metrics and key business information from this document.' },
          ],
        }],
      })
      const pdfText = msg.content[0]?.type === 'text' ? msg.content[0].text : null
      if (!pdfText) throw new Error('Unexpected empty response from model')
      extracted = parseClaudeJSON(pdfText)

    } else if (isImage) {
      const base64 = Buffer.from(fetched.buffer).toString('base64')
      const mediaType = (file_type?.startsWith('image/') ? file_type : `image/${ext}`)
      if (!ALLOWED_MEDIA_TYPES.includes(mediaType as AllowedMediaType)) {
        return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
      }
      const validatedMediaType = mediaType as AllowedMediaType
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-6-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: validatedMediaType, data: base64 } },
            { type: 'text', text: 'Extract all financial metrics and key business information visible in this image.' },
          ],
        }],
      })
      const imgText = msg.content[0]?.type === 'text' ? msg.content[0].text : null
      if (!imgText) throw new Error('Unexpected empty response from model')
      extracted = parseClaudeJSON(imgText)

    } else if (isExcel) {
      const wb = XLSX.read(fetched.buffer, { type: 'array' })
      const text = wb.SheetNames.map(name => {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name])
        return `=== Sheet: ${name} ===\n${csv}`
      }).join('\n\n')
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-6-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Extract all financial metrics and key business information from this spreadsheet:\n\n${text.slice(0, 20000)}`,
        }],
      })
      const xlsText = msg.content[0]?.type === 'text' ? msg.content[0].text : null
      if (!xlsText) throw new Error('Unexpected empty response from model')
      extracted = parseClaudeJSON(xlsText)

    } else {
      // Try as plain text (Word docs, PPT exports, etc.)
      const text = new TextDecoder().decode(fetched.buffer)
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-6-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Extract all financial metrics and key business information from this document:\n\n${text.slice(0, 20000)}`,
        }],
      })
      const plainText = msg.content[0]?.type === 'text' ? msg.content[0].text : null
      if (!plainText) throw new Error('Unexpected empty response from model')
      extracted = parseClaudeJSON(plainText)
    }
  } catch (err) {
    return NextResponse.json({ error: `Extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 500 })
  }

  // Persist to database (supabase from requireAuth above)
  const { error: updateError } = await supabase
    .from('documents')
    .update({ extracted_data: extracted })
    .eq('id', document_id)
  if (updateError) {
    return NextResponse.json({ error: `Failed to persist extraction: ${updateError.message}` }, { status: 500 })
  }

  return NextResponse.json({ extracted })
}
