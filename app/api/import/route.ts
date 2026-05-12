import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireAdminAuth } from '@/lib/api-auth'

// ── helpers ────────────────────────────────────────────────────────────────

function toDate(val: unknown): string {
  if (!val) return new Date().toISOString().slice(0, 10)
  if (typeof val === 'number' && val > 1900 && val < 2100) return `${val}-01-01`
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  return new Date().toISOString().slice(0, 10)
}

function mapStrategy(entity: string): 'impact' | 'venture' {
  return entity?.toUpperCase().includes('MIF') ? 'impact' : 'venture'
}

function mapInstrument(type: string): string {
  const map: Record<string, string> = { Equity: 'Equity', SAFE: 'SAFE', Note: 'Note', Warrant: 'Warrant' }
  return map[type] ?? 'Equity'
}

function pct(val: unknown): number {
  const n = parseFloat(String(val))
  if (isNaN(n) || n === 0) return 0
  return parseFloat((n < 1 ? n * 100 : n).toFixed(4))
}

function num(val: unknown): number {
  const n = parseFloat(String(val))
  return isNaN(n) ? 0 : n
}

// ── route ──────────────────────────────────────────────────────────────────

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  // Bulk import is destructive — it deletes every existing rounds/investments/
  // cap_table row for each company in the upload and re-inserts from the
  // workbook. Gate on admin role: RLS scopes access per team-member but does
  // not stop a non-admin from blowing away another company's history.
  const auth = await requireAdminAuth()
  if ('response' in auth) return auth.response
  const { supabase } = auth

  // Reject oversized uploads before reading into memory
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Secondary size check after reading (content-length may be absent on some clients)
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  // dryRun=true returns a preview of what would be imported without writing any data
  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') === 'true'

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer)

  // Support both the original sheet name and a generic fallback
  const rawSheetName = workbook.SheetNames.find(
    (n) => n === 'Data_Raw' || n.toLowerCase().includes('raw') || n.toLowerCase().includes('data')
  )

  if (!rawSheetName) {
    return NextResponse.json(
      { error: `Sheet "Data_Raw" not found. Available sheets: ${workbook.SheetNames.join(', ')}` },
      { status: 422 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[rawSheetName], { defval: '' })
    .filter((r: unknown) => {
      const row = r as Record<string, unknown>
      return row['Investment Name'] && String(row['Investment Name']).trim() !== ''
    })

  if (rawRows.length === 0) {
    return NextResponse.json({ error: 'No data rows found in the sheet' }, { status: 422 })
  }

  // ── Collect unique companies ──────────────────────────────────────────
  const uniqueNames = [...new Set(rawRows.map((r) => String(r['Investment Name']).trim()))]

  // ── Dry-run: return preview without writing ───────────────────────────
  if (dryRun) {
    const preview = uniqueNames.map(name => {
      const rows = rawRows.filter(r => String(r['Investment Name']).trim() === name)
      return {
        company: name,
        rowCount: rows.length,
        sector: String(rows[0]['Sector'] || 'Other').trim(),
        strategy: mapStrategy(String(rows[0]['Entity'] || '')),
        warning: 'Existing rounds, investments, and cap table entries for this company will be deleted and replaced.',
      }
    })
    return NextResponse.json({ dryRun: true, companies: preview, totalRows: rawRows.length })
  }

  const results = {
    companies: { created: 0, updated: 0 },
    rounds: { created: 0 },
    investments: { created: 0 },
    capTable: { created: 0 },
    errors: [] as string[],
  }

  // ── Resolve all existing companies in one round-trip (was N+1) ───────
  const { data: existingCompanies, error: existingErr } = await supabase
    .from('companies')
    .select('id, name')
    .in('name', uniqueNames)
  if (existingErr) {
    return NextResponse.json({ error: `Failed to look up companies: ${existingErr.message}` }, { status: 500 })
  }
  const existingByName = new Map<string, string>(
    (existingCompanies ?? []).map(c => [c.name, c.id])
  )

  // ── Process each company ─────────────────────────────────────────────
  for (const name of uniqueNames) {
    const rows = rawRows.filter((r) => String(r['Investment Name']).trim() === name)
    const firstRow = rows[0]

    let companyId: string
    const existingId = existingByName.get(name)

    if (existingId) {
      const { error: updErr } = await supabase.from('companies').update({
        sector: String(firstRow['Sector'] || 'Other').trim(),
        strategy: mapStrategy(String(firstRow['Entity'] || '')),
        hq: String(firstRow['Geography'] || '').trim(),
        status: 'active',
      }).eq('id', existingId)
      if (updErr) {
        results.errors.push(`Failed to update company "${name}": ${updErr.message}`)
        continue
      }
      companyId = existingId
      results.companies.updated++
    } else {
      const { data: created, error } = await supabase
        .from('companies')
        .insert({
          name,
          sector: String(firstRow['Sector'] || 'Other').trim(),
          strategy: mapStrategy(String(firstRow['Entity'] || '')),
          hq: String(firstRow['Geography'] || '').trim(),
          status: 'active',
        })
        .select('id')
        .single()

      if (error || !created) {
        results.errors.push(`Failed to create company "${name}": ${error?.message}`)
        continue
      }
      companyId = created.id
      results.companies.created++
    }

    // Delete existing data for a clean sync. Leaf tables go first so that a
    // mid-step failure leaves the parent (rounds) untouched and FKs intact,
    // making a re-run safe.
    const delCt  = await supabase.from('cap_table').delete().eq('company_id', companyId)
    if (delCt.error) {
      results.errors.push(`Failed to clear cap_table for "${name}": ${delCt.error.message}`)
      continue
    }
    const delInv = await supabase.from('investments').delete().eq('company_id', companyId)
    if (delInv.error) {
      results.errors.push(`Failed to clear investments for "${name}": ${delInv.error.message}`)
      continue
    }
    const delRounds = await supabase.from('rounds').delete().eq('company_id', companyId)
    if (delRounds.error) {
      results.errors.push(`Failed to clear rounds for "${name}": ${delRounds.error.message}`)
      continue
    }

    // ── Batch inserts ──────────────────────────────────────────────────
    // Build all round payloads up front, insert them in a single call, then
    // use the returned IDs to build investments and cap_table payloads. This
    // replaces 3 × N round-trips with 3 round-trips per company.
    const rowPayloads = rows.map(row => ({
      entity:         String(row['Entity'] || '').trim(),
      stage:          String(row['Stage'] || '').trim(),
      date:           toDate(row['Date of First Investment']),
      preMoney:       num(row['Pre-money Valuation']),
      postMoney:      num(row['Post Money Valuation']),
      currentVal:     num(row['Current Valuation']),
      totalRound:     num(row['Total Round']),
      investedAmount: num(row['Invested Amount']),
      ownershipPct:   pct(row['Ownership Percentage']),
      instrument:     mapInstrument(String(row['Type'] || 'Equity')),
    }))

    const roundsPayload = rowPayloads.map(p => ({
      company_id: companyId,
      date: p.date,
      type: p.stage || 'Seed',
      pre_money: p.preMoney,
      post_money: p.currentVal > 0 ? p.currentVal : p.postMoney,
      amount_raised: p.totalRound,
    }))

    const { data: insertedRounds, error: roundErr } = await supabase
      .from('rounds')
      .insert(roundsPayload)
      .select('id')

    if (roundErr || !insertedRounds || insertedRounds.length !== rowPayloads.length) {
      // PostgREST returns inserted rows in input order. If the count drifts
      // (RLS denial on a subset, partial failure), abort the rest of the
      // company instead of silently writing investments without matching rounds.
      results.errors.push(`Rounds insert failed for "${name}": ${roundErr?.message ?? 'unexpected row count'}`)
      continue
    }
    results.rounds.created += insertedRounds.length

    const investmentsPayload = rowPayloads.map((p, i) => ({
      company_id: companyId,
      round_id: insertedRounds[i].id,
      date: p.date,
      amount: p.investedAmount,
      instrument: p.instrument,
      valuation_cap: null,
    }))
    const { data: insertedInv, error: invErr } = await supabase
      .from('investments')
      .insert(investmentsPayload)
      .select('id')
    if (invErr) {
      results.errors.push(`Investments insert failed for "${name}": ${invErr.message}`)
    } else {
      results.investments.created += insertedInv?.length ?? 0
    }

    const capTablePayload = rowPayloads
      .map((p, i) => p.ownershipPct > 0
        ? {
            company_id: companyId,
            round_id: insertedRounds[i].id,
            shareholder_name: p.entity || 'Fund',
            ownership_percentage: p.ownershipPct,
          }
        : null)
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (capTablePayload.length > 0) {
      const { data: insertedCt, error: ctErr } = await supabase
        .from('cap_table')
        .insert(capTablePayload)
        .select('id')
      if (ctErr) {
        results.errors.push(`Cap-table insert failed for "${name}": ${ctErr.message}`)
      } else {
        results.capTable.created += insertedCt?.length ?? 0
      }
    }
  }

  return NextResponse.json({
    success: true,
    results,
    warning: 'Existing rounds, investments, and cap table entries were deleted and replaced. This operation is not reversible.',
  })
}
