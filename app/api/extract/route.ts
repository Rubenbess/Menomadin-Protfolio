import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function parseClaudeJSON(text: string) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  return JSON.parse(cleaned)
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
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const { document_id, file_url, file_name, file_type } = await req.json()
  if (!file_url || !document_id) {
    return NextResponse.json({ error: 'Missing document_id or file_url' }, { status: 400 })
  }

  // Download the file
  const fileRes = await fetch(file_url)
  if (!fileRes.ok) return NextResponse.json({ error: 'Could not fetch file' }, { status: 400 })

  const anthropic = new Anthropic({ apiKey })
  let extracted: { summary?: string; metrics?: Record<string, string>; key_points?: string[] } = {}

  const ext = (file_name ?? '').split('.').pop()?.toLowerCase() ?? ''
  const isPdf    = file_type?.includes('pdf') || ext === 'pdf'
  const isImage  = file_type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
  const isExcel  = ['xlsx', 'xls', 'csv'].includes(ext)

  try {
    if (isPdf) {
      const buffer = await fileRes.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: 'Extract all financial metrics and key business information from this document.' },
          ],
        }],
      })
      extracted = parseClaudeJSON((msg.content[0] as { text: string }).text)

    } else if (isImage) {
      const buffer = await fileRes.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mediaType = (file_type?.startsWith('image/') ? file_type : `image/${ext}`) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: 'Extract all financial metrics and key business information visible in this image.' },
          ],
        }],
      })
      extracted = parseClaudeJSON((msg.content[0] as { text: string }).text)

    } else if (isExcel) {
      const buffer = await fileRes.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const text = wb.SheetNames.map(name => {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name])
        return `=== Sheet: ${name} ===\n${csv}`
      }).join('\n\n')
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Extract all financial metrics and key business information from this spreadsheet:\n\n${text.slice(0, 20000)}`,
        }],
      })
      extracted = parseClaudeJSON((msg.content[0] as { text: string }).text)

    } else {
      // Try as plain text (Word docs, PPT exports, etc.)
      const text = await fileRes.text()
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Extract all financial metrics and key business information from this document:\n\n${text.slice(0, 20000)}`,
        }],
      })
      extracted = parseClaudeJSON((msg.content[0] as { text: string }).text)
    }
  } catch (err) {
    return NextResponse.json({ error: `Extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 500 })
  }

  // Persist to database
  const supabase = await createServerSupabaseClient()
  await supabase.from('documents').update({ extracted_data: extracted }).eq('id', document_id)

  return NextResponse.json({ extracted })
}
