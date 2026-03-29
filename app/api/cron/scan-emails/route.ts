import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

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
}

const OPPORTUNITY_KEYWORDS = [
  'raising', 'fundraising', 'funding round', 'series a', 'series b', 'series c',
  'seed round', 'pre-seed', 'pitch deck', 'investment opportunity', 'term sheet',
  'cap table', 'convertible note', 'safe note', 'due diligence', 'co-invest',
  'looking to raise', 'raising capital', 'seeking investment', 'venture round',
  'we are raising', 'our raise', 'closing our round', 'open to investors',
]

const SECTOR_KEYWORDS: Record<string, string[]> = {
  FinTech: ['fintech', 'payments', 'banking', 'lending', 'insurance', 'wealth', 'crypto', 'blockchain', 'defi'],
  HealthTech: ['healthtech', 'medtech', 'health', 'medical', 'clinical', 'biotech', 'pharma', 'diagnostics'],
  SaaS: ['saas', 'software', 'platform', 'b2b', 'enterprise', 'api', 'cloud'],
  CleanTech: ['cleantech', 'climate', 'energy', 'solar', 'sustainability', 'carbon', 'renewable'],
  EdTech: ['edtech', 'education', 'learning', 'training', 'upskilling'],
  DeepTech: ['ai', 'artificial intelligence', 'machine learning', 'robotics', 'quantum', 'semiconductor'],
  PropTech: ['proptech', 'real estate', 'property', 'construction'],
  FoodTech: ['foodtech', 'food', 'agri', 'agriculture', 'farm'],
}

function detectSector(text: string): string {
  const lower = text.toLowerCase()
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return sector
  }
  return 'Other'
}

function extractFundraisingAsk(text: string): number | null {
  // Match patterns like $5M, $2.5M, $500K, $1,000,000
  const patterns = [
    /\$(\d+(?:\.\d+)?)\s*m(?:illion)?/i,
    /\$(\d+(?:\.\d+)?)\s*k(?:illion)?/i,
    /\$(\d{1,3}(?:,\d{3})+)/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''))
      if (pattern.source.includes('k')) return Math.round(value * 1000)
      if (pattern.source.includes('m')) return Math.round(value * 1_000_000)
      return Math.round(value)
    }
  }
  return null
}

function extractCompanyName(subject: string, fromName: string, body: string): string {
  // Try to extract from subject patterns like "Introduction: CompanyName" or "CompanyName - Pitch"
  const subjectPatterns = [
    /introduction[:\s]+([A-Z][A-Za-z0-9\s&]+?)(?:\s[-–|]|$)/i,
    /^([A-Z][A-Za-z0-9]+)\s*[-–|]/,
    /([A-Z][A-Za-z0-9\s]+?)\s+(?:pitch|deck|raise|round|fundraise)/i,
  ]
  for (const pattern of subjectPatterns) {
    const match = subject.match(pattern)
    if (match?.[1]?.trim().length > 1) return match[1].trim()
  }
  // Fall back to sender's company name (first capitalized word from name if org)
  const nameWords = fromName.split(/\s+/)
  if (nameWords.length >= 2) return nameWords.slice(0, 2).join(' ')
  return fromName || 'Unknown Company'
}

function analyzeEmail(
  subject: string,
  body: string,
  fromName: string,
  fromEmail: string
): OpportunityData | null {
  const combined = `${subject} ${body}`.toLowerCase()
  const matchCount = OPPORTUNITY_KEYWORDS.filter(k => combined.includes(k)).length

  if (matchCount === 0) return null

  return {
    is_opportunity: true,
    company_name: extractCompanyName(subject, fromName, body),
    sector: detectSector(combined),
    description: body.slice(0, 300).replace(/\s+/g, ' ').trim(),
    fundraising_ask: extractFundraisingAsk(`${subject} ${body}`),
    hq: null,
    lead_partner: fromName || fromEmail || null,
  }
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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

      const fromName = email.from?.emailAddress?.name ?? ''
      const fromEmail = email.from?.emailAddress?.address ?? ''
      const from = `${fromName} <${fromEmail}>`
      const subject = email.subject ?? '(no subject)'

      const analysis = analyzeEmail(subject, body, fromName, fromEmail)

      if (!analysis?.is_opportunity) continue
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
