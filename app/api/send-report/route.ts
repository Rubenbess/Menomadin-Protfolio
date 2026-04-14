import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@menomadin.com'

  if (!resendKey) {
    return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 })
  }

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

  const toAddress = to ?? 'rubenb@menomadin.com'
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
