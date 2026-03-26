import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const { deck_url } = await req.json()
  if (!deck_url) return NextResponse.json({ error: 'No deck_url provided' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

  // Fetch the PDF from Supabase storage
  let pdfBuffer: ArrayBuffer
  try {
    const res = await fetch(deck_url)
    if (!res.ok) return NextResponse.json({ error: 'Could not fetch deck file' }, { status: 400 })
    pdfBuffer = await res.arrayBuffer()
  } catch {
    return NextResponse.json({ error: 'Failed to download deck' }, { status: 400 })
  }

  const base64 = Buffer.from(pdfBuffer).toString('base64')

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Analyze this pitch deck and extract the following information. Return ONLY a valid JSON object with these exact keys (use null for missing fields):

{
  "company_name": string or null,
  "tagline": string or null (one-line description),
  "problem": string or null (1-2 sentences),
  "solution": string or null (1-2 sentences),
  "business_model": string or null,
  "market_size": string or null,
  "team": string or null (key founders/team members),
  "traction": string or null (key metrics, revenue, users),
  "fundraising_ask": number or null (in USD, numbers only),
  "stage": string or null (Pre-seed/Seed/Series A etc),
  "sector": string or null,
  "hq": string or null (city, country),
  "summary": string or null (2-3 sentence overall summary)
}`,
          },
        ],
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })

  try {
    const extracted = JSON.parse(jsonMatch[0])
    return NextResponse.json({ extracted })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }
}
