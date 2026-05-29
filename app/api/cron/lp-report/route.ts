import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { requireCronAuth } from '@/lib/api-auth'
import { BRAND_NO_REPLY_EMAIL, FUND_FULL_NAME, FUND_PORTFOLIO_NAME, FUND_SHAREHOLDER_ALIASES, isFundShareholder } from '@/lib/branding'
import { fmt$$ } from '@/lib/calculations'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const cronError = requireCronAuth(req)
  if (cronError) return cronError

  // Vercel cron fires this route ~once/day; cap at 60/min purely to detect
  // a leaked-bearer scenario where a single instance gets pounded.
  const rl = checkRateLimit('cron-lp-report', 60, 60_000)
  if (rl) return NextResponse.json({ error: rl }, { status: 429 })

  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? BRAND_NO_REPLY_EMAIL
  const lpEmails  = process.env.LP_EMAILS // comma-separated list of LP email addresses

  if (!resendKey || !lpEmails) {
    return NextResponse.json({ error: 'Missing RESEND_API_KEY or LP_EMAILS env vars' }, { status: 503 })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 503 })
  }

  // Cron runs without a user session. After rls_tighten_team_members.sql every
  // core table requires auth.uid() to be a registered team member, which is
  // never true here. Use the service role to read the portfolio data directly;
  // bearer auth via requireCronAuth above is the perimeter.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // Narrow each select to the columns actually rendered in the email template
  // — keeps memory bounded and lets the index-only scans short-circuit.
  //
  // cap_table is restricted to the fund's own holdings (the LP-facing
  // "Ownership" column means "what does Menomadin own"). Without this filter
  // any cap_table row could be picked — founders, employees, angels — and
  // mislabeled as the fund's stake in LP communications.
  const [companiesRes, investmentsRes, roundsRes, capTableRes] = await Promise.all([
    supabase.from('companies').select('id, name, sector, hq, entry_stage, status').order('name'),
    supabase.from('investments').select('company_id, amount'),
    supabase.from('rounds').select('company_id, date, post_money').order('date', { ascending: false }),
    supabase
      .from('cap_table')
      .select('company_id, shareholder_name, ownership_percentage, created_at')
      .in('shareholder_name', FUND_SHAREHOLDER_ALIASES as readonly string[])
      .order('created_at', { ascending: false }),
  ])

  const companies   = companiesRes.data   ?? []
  const investments = investmentsRes.data ?? []
  const rounds      = roundsRes.data      ?? []
  const capTable    = capTableRes.data    ?? []

  const totalInvested = investments.reduce((s: number, i: { amount: number }) => s + i.amount, 0)
  const activeCount   = companies.filter((c: { status: string }) => c.status === 'active').length

  const now = new Date()
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`

  // Escape any DB-supplied string interpolated into the HTML body. A company
  // named `<script>...</script>` would otherwise execute in LPs' email clients.
  function esc(s: string | null | undefined): string {
    return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  const companyRows = companies
    .filter((c: { status: string }) => c.status === 'active')
    .map((c: { id: string; name: string; sector: string; hq: string; entry_stage: string | null }) => {
      const inv = investments
        .filter((i: { company_id: string }) => i.company_id === c.id)
        .reduce((s: number, i: { amount: number }) => s + i.amount, 0)
      const latestRound = rounds.find((r: { company_id: string }) => r.company_id === c.id)
      // capTable is already filtered to fund-aliased rows and ordered by
      // created_at desc, so the first hit is the most recent fund holding.
      // .find() is safer than .pop() — it doesn't mutate, and the prior
      // .pop() relied on an unordered query that could return any holder.
      const cap = capTable.find(
        (ct: { company_id: string; shareholder_name: string }) =>
          ct.company_id === c.id && isFundShareholder(ct.shareholder_name)
      ) as { ownership_percentage: number } | undefined
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#0f172a">${esc(c.name)}</td>
        <td style="padding:10px 16px;font-size:13px;color:#64748b">${esc(c.sector) || '—'}</td>
        <td style="padding:10px 16px;font-size:13px;color:#64748b">${inv > 0 ? fmt$$(inv) : '—'}</td>
        <td style="padding:10px 16px;font-size:13px;color:#64748b">${latestRound ? fmt$$(latestRound.post_money) : '—'}</td>
        <td style="padding:10px 16px;font-size:13px;color:#64748b">${cap ? `${cap.ownership_percentage.toFixed(1)}%` : '—'}</td>
      </tr>`
    }).join('')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;padding:32px 16px">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:24px 32px;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:20px;font-weight:700">${FUND_PORTFOLIO_NAME}</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px">${quarter} LP Update</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px">
        <div style="background:white;border:1px solid #f1f5f9;border-radius:12px;padding:16px">
          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">Total Invested</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#0f172a">${fmt$$(totalInvested)}</p>
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
        ${FUND_FULL_NAME} · This report was auto-generated from the portfolio platform.
      </p>
    </div>
  `

  const recipients = lpEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
  const resend = new Resend(resendKey)

  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    subject: `${FUND_PORTFOLIO_NAME} — ${quarter} Update`,
    html,
  })

  if (sendError) {
    // 502 not 500: Resend is an external dependency, so a send failure is a
    // bad-gateway condition rather than a bug in our code. Lets monitoring
    // distinguish "Resend was down" from "our handler crashed".
    return NextResponse.json({ error: sendError.message }, { status: 502 })
  }

  return NextResponse.json({ sent: recipients.length, quarter })
}
