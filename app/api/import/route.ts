import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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
  const supabase = await createServerSupabaseClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  // ── Process each company ─────────────────────────────────────────────
  for (const name of uniqueNames) {
    const rows = rawRows.filter((r) => String(r['Investment Name']).trim() === name)
    const firstRow = rows[0]

    // Upsert company by name
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('name', name)
      .single()

    let companyId: string

    if (existing) {
      // Update
      await supabase.from('companies').update({
        sector: String(firstRow['Sector'] || 'Other').trim(),
        strategy: mapStrategy(String(firstRow['Entity'] || '')),
        hq: String(firstRow['Geography'] || '').trim(),
        status: 'active',
      }).eq('id', existing.id)
      companyId = existing.id
      results.companies.updated++
    } else {
      // Create
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

    // Delete existing rounds/investments/cap_table for a clean sync
    await supabase.from('rounds').delete().eq('company_id', companyId)
    await supabase.from('investments').delete().eq('company_id', companyId)
    await supabase.from('cap_table').delete().eq('company_id', companyId)

    // Insert fresh data from each row
    for (const row of rows) {
      const entity = String(row['Entity'] || '').trim()
      const stage = String(row['Stage'] || '').trim()
      const date = toDate(row['Date of First Investment'])
      const preMoney = num(row['Pre-money Valuation'])
      const postMoney = num(row['Post Money Valuation'])
      const currentVal = num(row['Current Valuation'])
      const totalRound = num(row['Total Round'])
      const investedAmount = num(row['Invested Amount'])
      const ownershipPctVal = pct(row['Ownership Percentage'])
      const instrument = mapInstrument(String(row['Type'] || 'Equity'))

      // Round — use current valuation as latest post-money if available
      const { data: roundData, error: roundErr } = await supabase
        .from('rounds')
        .insert({
          company_id: companyId,
          date,
          type: stage || 'Seed',
          pre_money: preMoney,
          post_money: currentVal > 0 ? currentVal : postMoney,
          amount_raised: totalRound,
        })
        .select('id')
        .single()

      if (roundErr || !roundData) {
        results.errors.push(`Round error for "${name}": ${roundErr?.message}`)
        continue
      }

      results.rounds.created++

      // Investment
      const { error: invErr } = await supabase.from('investments').insert({
        company_id: companyId,
        round_id: roundData.id,
        date,
        amount: investedAmount,
        instrument,
        valuation_cap: null,
      })
      if (!invErr) results.investments.created++

      // Cap table
      if (ownershipPctVal > 0) {
        const { error: ctErr } = await supabase.from('cap_table').insert({
          company_id: companyId,
          round_id: roundData.id,
          shareholder_name: entity || 'Fund',
          ownership_percentage: ownershipPctVal,
        })
        if (!ctErr) results.capTable.created++
      }
    }
  }

  return NextResponse.json({
    success: true,
    results,
    warning: 'Existing rounds, investments, and cap table entries were deleted and replaced. This operation is not reversible.',
  })
}
