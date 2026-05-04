import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY

  // Inbound auth must use a dedicated secret — never the Resend API key.
  // Reusing RESEND_API_KEY as the bearer token leaks inbound auth to anyone
  // with legitimate access to the outbound mail credential. Prefer a dedicated
  // REPORT_API_KEY; fall back to CRON_SECRET so this endpoint can be invoked
  // by Vercel cron with the same shared secret used elsewhere.
  const inboundSecret = process.env.REPORT_API_KEY ?? process.env.CRON_SECRET

  // Fail closed when neither secret is set — otherwise `Bearer undefined`
  // would match a `Bearer undefined` request and bypass auth entirely.
  if (!inboundSecret) {
    return NextResponse.json(
      { error: 'Missing REPORT_API_KEY (or CRON_SECRET fallback)' },
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
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@menomadin.com'

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
