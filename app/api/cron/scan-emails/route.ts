import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getValidAccessToken,
  type EmailIntegration,
} from '@/lib/microsoft-graph'

interface GraphEmail {
  id: string
  subject: string | null
  bodyPreview: string
  from: { emailAddress: { address: string; name: string } }
  receivedDateTime: string
  body: { content: string; contentType: string }
}

interface OpportunityData {
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
  const patterns = [
    /\$(\d+(?:\.\d+)?)\s*m(?:illion)?/i,
    /\$(\d+(?:\.\d+)?)\s*k/i,
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

function extractCompanyName(subject: string, fromName: string): string {
  const subjectPatterns = [
    /introduction[:\s]+([A-Z][A-Za-z0-9\s&]+?)(?:\s[-–|]|$)/i,
    /^([A-Z][A-Za-z0-9]+)\s*[-–|]/,
    /([A-Z][A-Za-z0-9\s]+?)\s+(?:pitch|deck|raise|round|fundraise)/i,
  ]
  for (const pattern of subjectPatterns) {
    const name = subject.match(pattern)?.[1]?.trim()
    if (name && name.length > 1) return name
  }
  const nameWords = fromName.split(/\s+/)
  if (nameWords.length >= 2) return nameWords.slice(0, 2).join(' ')
  return fromName || 'Unknown Company'
}

function detectOpportunity(
  subject: string,
  body: string,
  fromName: string,
  fromEmail: string
): OpportunityData | null {
  const combined = `${subject} ${body}`.toLowerCase()
  const matched = OPPORTUNITY_KEYWORDS.filter(k => combined.includes(k)).length
  if (matched === 0) return null

  return {
    company_name: extractCompanyName(subject, fromName),
    sector: detectSector(combined),
    description: body.slice(0, 300).replace(/\s+/g, ' ').trim(),
    fundraising_ask: extractFundraisingAsk(`${subject} ${body}`),
    hq: null,
    lead_partner: fromName || fromEmail || null,
  }
}

async function fetchEmails(accessToken: string, since: string): Promise<GraphEmail[]> {
  const filter = encodeURIComponent(`receivedDateTime ge ${since}`)
  const url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=${filter}&$select=id,subject,bodyPreview,from,receivedDateTime,body&$top=50&$orderby=receivedDateTime asc`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })

  if (!res.ok) return []
  const data = await res.json()
  return data.value ?? []
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
    const accessToken = await getValidAccessToken(integration, supabase)
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

      const analysis = detectOpportunity(subject, body, fromName, fromEmail)
      if (!analysis) continue
      if (!analysis.company_name || analysis.company_name === 'Unknown Company') continue

      const { data: existing } = await supabase
        .from('pipeline')
        .select('id')
        .ilike('name', analysis.company_name)
        .maybeSingle()

      if (existing) continue

      await supabase.from('pipeline').insert({
        name: analysis.company_name,
        sector: analysis.sector,
        stage: 'Seed',
        status: 'Prospecting',
        notes: `${analysis.description}\n\nDetected via email from: ${from}\nSubject: ${subject}`,
        hq: analysis.hq,
        fundraising_ask: analysis.fundraising_ask,
        lead_partner: analysis.lead_partner,
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
