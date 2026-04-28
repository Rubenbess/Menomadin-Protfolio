import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireCronAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const cronError = requireCronAuth(req)
  if (cronError) return cronError

  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@menomadin.com'
  const lpEmails  = process.env.LP_EMAILS // comma-separated list of LP email addresses

  if (!resendKey || !lpEmails) {
    return NextResponse.json({ error: 'Missing RESEND_API_KEY or LP_EMAILS env vars' }, { status: 500 })
  }

  const supabase = await createServerSupabaseClient()

  const [companiesRes, investmentsRes, roundsRes, capTableRes] = await Promise.all([
    supabase.from('companies').select('*').order('name'),
    supabase.from('investments').select('*'),
    supabase.from('rounds').select('*').order('date', { ascending: false }),
    supabase.from('cap_table').select('*'),
  ])

  const companies   = companiesRes.data   ?? []
  const investments = investmentsRes.data ?? []
  const rounds      = roundsRes.data      ?? []
  const capTable    = capTableRes.data    ?? []

  const totalInvested = investments.reduce((s: number, i: { amount: number }) => s + i.amount, 0)
  const activeCount   = companies.filter((c: { status: string }) => c.status === 'active').length

  function fmt$(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
    return `$${n}`
  }

  const now = new Date()
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`

  const companyRows = companies
    .filter((c: { status: string }) => c.status === 'active')
    .map((c: { id: string; name: string; sector: string; hq: string; entry_stage: string | null }) => {
      const inv = investments
        .filter((i: { company_id: string }) => i.company_id === c.id)
        .reduce((s: number, i: { amount: number }) => s + i.amount, 0)
      const latestRound = rounds.find((r: { company_id: string }) => r.company_id === c.id)
      const cap = capTable
        .filter((ct: { company_id: string }) => ct.company_id === c.id)
        .pop() as { ownership_percentage: number } | undefined
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a">${c.name}</td>
        <td style="padding:10px 16px;font-size:13px;color:#64748b">${c.sector ?? '—'}</td>
        <td style="padding:10px 16px;font-size:13px;color:#64748b">${inv > 0 ? fmt$(inv) : '—'}</td>
        <td style="padding:10px 16px;font-size:13px;color:#64748b">${latestRound ? fmt$(latestRound.post_money) : '—'}</td>
        <td style="padding:10px 16px;font-size:13px;color:#64748b">${cap ? `${cap.ownership_percentage.toFixed(1)}%` : '—'}</td>
      </tr>`
    }).join('')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;padding:32px 16px">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:24px 32px;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:20px;font-weight:700">Menomadin Portfolio</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px">${quarter} LP Update</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px">
        <div style="background:white;border:1px solid #f1f5f9;border-radius:12px;padding:16px">
          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">Total Invested</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#0f172a">${fmt$(totalInvested)}</p>
        </div>
        <div style="background:white;border:1px solid #f1f5f9;border-radius:12px;padding:16px">
          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">Portfolio Companies</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#0f172a">${companies.length}</p>
        </div>
        <div style="background:white;border:1px solid #f1f5f9;border-radius:12px;padding:16px">
          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">Active Companies</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#0f172a">${activeCount}</p>
        </div>
      </div>

      <h2 style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:12px">Active Portfolio</h2>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;border:1px solid #f1f5f9;margin-bottom:24px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase">Company</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase">Sector</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase">Invested</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase">Latest Val.</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:600;color:#94a3b8;text-align:left;text-transform:uppercase">Ownership</th>
          </tr>
        </thead>
        <tbody>${companyRows}</tbody>
      </table>

      <p style="color:#94a3b8;font-size:12px;text-align:center">
        Menomadin Group · This report was auto-generated from the portfolio platform.
      </p>
    </div>
  `

  const recipients = lpEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
  const resend = new Resend(resendKey)

  await resend.emails.send({
    from: fromEmail,
    to: recipients,
    subject: `Menomadin Portfolio — ${quarter} Update`,
    html,
  })

  return NextResponse.json({ sent: recipients.length, quarter })
}
