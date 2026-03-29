import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

interface EmailIntegration {
  id: string
  user_id: string
  email: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string
  last_scanned_at: string | null
}

interface GraphEmail {
  id: string
  subject: string | null
  bodyPreview: string
  from: { emailAddress: { address: string; name: string } }
  receivedDateTime: string
  body: { content: string; contentType: string }
}

interface OpportunityData {
  is_opportunity: boolean
  company_name: string
  sector: string
  description: string
  fundraising_ask: number | null
  hq: string | null
  lead_partner: string | null
  confidence: 'high' | 'medium' | 'low'
}

async function refreshAccessToken(
  integration: EmailIntegration,
  supabase: SupabaseClient
): Promise<string | null> {
  if (!integration.refresh_token) return null

  const res = await fetch(
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: integration.refresh_token,
        scope: 'offline_access Mail.Read User.Read',
      }),
    }
  )

  const tokens = await res.json()
  if (!tokens.access_token) return null

  await supabase.from('email_integrations').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? integration.refresh_token,
    token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
  }).eq('id', integration.id)

  return tokens.access_token
}

async function getAccessToken(
  integration: EmailIntegration,
  supabase: SupabaseClient
): Promise<string | null> {
  const expiresAt = new Date(integration.token_expires_at).getTime()
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    return refreshAccessToken(integration, supabase)
  }
  return integration.access_token
}

async function fetchEmails(accessToken: string, since: string): Promise<GraphEmail[]> {
  const filter = encodeURIComponent(`receivedDateTime ge ${since}`)
  const url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=${filter}&$select=id,subject,bodyPreview,from,receivedDateTime,body&$top=50&$orderby=receivedDateTime asc`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) return []
  const data = await res.json()
  return data.value ?? []
}

async function analyzeEmail(
  subject: string,
  body: string,
  from: string,
  anthropic: Anthropic
): Promise<OpportunityData | null> {
  const prompt = `You are an investment analyst assistant. Analyze this email and determine if it contains an investment opportunity (startup pitch, fundraising announcement, deal introduction, etc.).

Email from: ${from}
Subject: ${subject}
Body:
${body.slice(0, 3000)}

Respond with ONLY a JSON object (no markdown) with these fields:
{
  "is_opportunity": boolean,
  "company_name": string (company/startup name, or "Unknown" if unclear),
  "sector": string (e.g. "FinTech", "HealthTech", "SaaS", "CleanTech", etc.),
  "description": string (1-2 sentence summary of what the company does),
  "fundraising_ask": number or null (amount in USD if mentioned, e.g. 5000000 for $5M),
  "hq": string or null (city, country if mentioned),
  "lead_partner": string or null (person who sent or introduced the deal),
  "confidence": "high" | "medium" | "low" (confidence this is an investment opportunity)
}

Only mark is_opportunity as true if this is clearly a startup fundraising, investor introduction, or deal pitch. Ignore newsletters, administrative emails, and general correspondence.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text.trim()) as OpportunityData
    return parsed
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const { data: integrations, error: intErr } = await supabase
    .from('email_integrations')
    .select('*')

  if (intErr || !integrations?.length) {
    return NextResponse.json({ scanned: 0, opportunities: 0 })
  }

  let totalScanned = 0
  let totalOpportunities = 0

  for (const integration of integrations as EmailIntegration[]) {
    const accessToken = await getAccessToken(integration, supabase)
    if (!accessToken) continue

    const since = integration.last_scanned_at
      ? new Date(integration.last_scanned_at).toISOString()
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const emails = await fetchEmails(accessToken, since)
    totalScanned += emails.length

    for (const email of emails) {
      const body = email.body?.contentType === 'html'
        ? email.body.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : (email.body?.content ?? email.bodyPreview ?? '')

      const from = `${email.from?.emailAddress?.name ?? ''} <${email.from?.emailAddress?.address ?? ''}>`
      const subject = email.subject ?? '(no subject)'

      const analysis = await analyzeEmail(subject, body, from, anthropic)

      if (!analysis?.is_opportunity || analysis.confidence === 'low') continue
      if (!analysis.company_name || analysis.company_name === 'Unknown') continue

      const { data: existing } = await supabase
        .from('pipeline')
        .select('id')
        .ilike('name', analysis.company_name)
        .maybeSingle()

      if (existing) continue

      await supabase.from('pipeline').insert({
        name: analysis.company_name,
        sector: analysis.sector ?? 'Unknown',
        stage: 'Seed',
        status: 'prospecting',
        notes: `${analysis.description}\n\nDetected via email from: ${from}\nSubject: ${subject}`,
        hq: analysis.hq ?? null,
        fundraising_ask: analysis.fundraising_ask ?? null,
        lead_partner: analysis.lead_partner ?? null,
        source: 'Email Scanner',
      })

      totalOpportunities++
    }

    await supabase
      .from('email_integrations')
      .update({ last_scanned_at: new Date().toISOString() })
      .eq('id', integration.id)
  }

  return NextResponse.json({ scanned: totalScanned, opportunities: totalOpportunities })
}
