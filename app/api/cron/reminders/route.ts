import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireCronAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const cronError = requireCronAuth(req)
  if (cronError) return cronError

  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@menomadin.com'
  const toEmail   = process.env.TEAM_EMAIL

  if (!resendKey || !toEmail) {
    return NextResponse.json({ error: 'Missing RESEND_API_KEY or TEAM_EMAIL env vars' }, { status: 500 })
  }

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*, companies(name)')
    .eq('completed', false)
    .lte('due_date', today)
    .order('due_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!reminders?.length) return NextResponse.json({ sent: 0 })

  const resend = new Resend(resendKey)

  const rows = reminders.map((r: { title: string; due_date: string; category: string; companies?: { name: string } | null; notes: string | null }) =>
    `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a">${r.title}</td>
      <td style="padding:10px 16px;font-size:13px;color:#64748b">${r.due_date}</td>
      <td style="padding:10px 16px;font-size:13px;color:#64748b">${r.category}</td>
      <td style="padding:10px 16px;font-size:13px;color:#64748b">${(r.companies as { name: string } | null)?.name ?? '—'}</td>
      <td style="padding:10px 16px;font-size:13px;color:#64748b">${r.notes ?? ''}</td>
    </tr>`
  ).join('')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;padding:32px 16px">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:24px 32px;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:20px;font-weight:700">Menomadin Portfolio</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px">Daily Reminder Digest</p>
      </div>
      <p style="color:#475569;font-size:14px;margin-bottom:24px">
        You have <strong style="color:#0f172a">${reminders.length} overdue ${reminders.length === 1 ? 'reminder' : 'reminders'}</strong> as of today.
      </p>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #f1f5f9">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase;letter-spacing:0.05em">Title</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase;letter-spacing:0.05em">Due</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase;letter-spacing:0.05em">Category</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase;letter-spacing:0.05em">Company</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase;letter-spacing:0.05em">Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;text-align:center">
        Menomadin Portfolio Platform · <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reminders" style="color:#6366f1">View all reminders →</a>
      </p>
    </div>
  `

  await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `[Menomadin] ${reminders.length} reminder${reminders.length > 1 ? 's' : ''} due`,
    html,
  })

  return NextResponse.json({ sent: reminders.length })
}
