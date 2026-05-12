import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { BRAND_NO_REPLY_EMAIL } from '@/lib/branding'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY

  // Inbound auth uses a dedicated secret. Previously fell back to CRON_SECRET
  // for convenience, but that coupled "Vercel cron can fire reports" with
  // "anyone with the cron token can blast arbitrary email" — a leaked cron
  // token shouldn't grant the ability to send mail.
  const inboundSecret = process.env.REPORT_API_KEY

  // Fail closed when the secret is unset — otherwise `Bearer undefined` would
  // match a `Bearer undefined` request and bypass auth entirely.
  if (!inboundSecret) {
    return NextResponse.json(
      { error: 'Missing REPORT_API_KEY' },
      { status: 503 }
    )
  }
  if (!resendKey) {
    return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${inboundSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cap per-process throughput so a leaked bearer can't blast unlimited mail.
  const rl = checkRateLimit('send-report', 10, 60_000)
  if (rl) return NextResponse.json({ error: rl }, { status: 429 })

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? BRAND_NO_REPLY_EMAIL

  let body: { report?: string; subject?: string; to?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { report, subject, to } = body
  if (!report) {
    return NextResponse.json({ error: 'Missing report field' }, { status: 400 })
  }

  // Default recipient comes from env so this code can ship without a hardcoded
  // personal address. Falls back to the broader team list if neither is set.
  const toAddress = to ?? process.env.WEEKLY_REPORT_TO ?? process.env.TEAM_EMAIL
  if (!toAddress) {
    return NextResponse.json({ error: 'No recipient: provide `to` or set WEEKLY_REPORT_TO/TEAM_EMAIL' }, { status: 400 })
  }
  const emailSubject = subject ?? `Menomadin Weekly Deal Report | ${new Date().toISOString().split('T')[0]}`

  const resend = new Resend(resendKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: toAddress,
    subject: emailSubject,
    text: report,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sent: true, to: toAddress, subject: emailSubject })
}
