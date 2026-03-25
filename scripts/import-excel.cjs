const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://bjzrypyuofqblqvqngao.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const FILE = 'C:/Users/rubenb/OneDrive - Menomadin Group/Investment Team/Investment_Dashboard.xlsx'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── helpers ────────────────────────────────────────────────────────────────

function toDate(val) {
  if (!val) return null
  // Excel stores dates as serials; years stored as plain numbers like 2020
  if (typeof val === 'number' && val > 1900 && val < 2100) return `${val}-01-01`
  if (typeof val === 'number') {
    // Excel date serial
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  return null
}

function mapStrategy(entity, sector) {
  if (!entity) return 'venture'
  const e = entity.toString().toUpperCase()
  if (e.includes('MIF')) return 'impact'
  return 'venture'
}

function mapStatus() { return 'active' }

function mapInstrument(type) {
  if (!type) return 'Equity'
  const t = type.toString()
  if (t === 'Equity') return 'Equity'
  if (t === 'SAFE') return 'SAFE'
  if (t === 'Note') return 'Note'
  if (t === 'Warrant') return 'Warrant'
  return 'Equity'
}

function pct(val) {
  if (!val || val === '') return 0
  // values like 0.0337 → 3.37%
  const n = parseFloat(val)
  return n < 1 ? parseFloat((n * 100).toFixed(4)) : n
}

// ── main ───────────────────────────────────────────────────────────────────

async function run() {
  const workbook = XLSX.readFile(FILE)

  // Use Portfolio_Summary for unique companies
  const summarySheet = workbook.Sheets['Portfolio_Summary']
  const summaryRows = XLSX.utils.sheet_to_json(summarySheet, { defval: '' })

  // Use Data_Raw for full investment detail (one row per investment tranche)
  const rawSheet = workbook.Sheets['Data_Raw']
  const rawRows = XLSX.utils.sheet_to_json(rawSheet, { defval: '' })
    .filter(r => r['Investment Name'] && r['Investment Name'] !== '')

  console.log(`Found ${summaryRows.length} companies, ${rawRows.length} investment rows`)

  // ── 1. Create companies ────────────────────────────────────────────────
  console.log('\n── Creating companies…')
  const companyIdMap = {} // name → uuid

  for (const row of summaryRows) {
    const name = row['Investment Name']
    if (!name) continue

    // Find first raw row for this company to get entity/geography
    const raw = rawRows.find(r => r['Investment Name'] === name) || {}

    const company = {
      name: name.toString().trim(),
      sector: (row['Sector'] || raw['Sector'] || 'Other').toString().trim(),
      strategy: mapStrategy(raw['Entity'], raw['Sector']),
      hq: (raw['Geography'] || '').toString().trim(),
      status: mapStatus(),
    }

    const { data, error } = await supabase
      .from('companies')
      .insert(company)
      .select('id')
      .single()

    if (error) {
      console.error(`  ✗ ${name}: ${error.message}`)
      continue
    }

    companyIdMap[name] = data.id
    console.log(`  ✓ ${name} (${company.strategy}, ${company.sector})`)
  }

  // ── 2. Create rounds + investments + cap table per raw row ─────────────
  console.log('\n── Creating rounds, investments & cap table entries…')

  // Group raw rows by company name
  const grouped = {}
  for (const row of rawRows) {
    const name = row['Investment Name']?.toString().trim()
    if (!name) continue
    if (!grouped[name]) grouped[name] = []
    grouped[name].push(row)
  }

  for (const [name, rows] of Object.entries(grouped)) {
    const companyId = companyIdMap[name]
    if (!companyId) {
      console.warn(`  ! Skipping "${name}" — not in companies`)
      continue
    }

    for (const row of rows) {
      const entity = (row['Entity'] || '').toString().trim()
      const stage = (row['Stage'] || '').toString().trim()
      const date = toDate(row['Date of First Investment']) || '2020-01-01'
      const preMoney = parseFloat(row['Pre-money Valuation']) || 0
      const postMoney = parseFloat(row['Post Money Valuation']) || 0
      const totalRound = parseFloat(row['Total Round']) || 0
      const investedAmount = parseFloat(row['Invested Amount']) || 0
      const currentVal = parseFloat(row['Current Valuation']) || postMoney
      const ownershipPctVal = pct(row['Ownership Percentage'])
      const instrument = mapInstrument(row['Type'])

      // Create round
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

      if (roundErr) {
        console.error(`  ✗ Round for ${name} (${entity}): ${roundErr.message}`)
        continue
      }

      const roundId = roundData.id

      // Create investment
      const { error: invErr } = await supabase.from('investments').insert({
        company_id: companyId,
        round_id: roundId,
        date,
        amount: investedAmount,
        instrument,
        valuation_cap: null,
      })

      if (invErr) console.error(`  ✗ Investment for ${name} (${entity}): ${invErr.message}`)

      // Create cap table entry (fund ownership)
      if (ownershipPctVal > 0) {
        const { error: ctErr } = await supabase.from('cap_table').insert({
          company_id: companyId,
          round_id: roundId,
          shareholder_name: entity || 'Fund',
          ownership_percentage: ownershipPctVal,
        })
        if (ctErr) console.error(`  ✗ Cap table for ${name} (${entity}): ${ctErr.message}`)
      }

      console.log(`  ✓ ${name} | ${entity} | ${stage} | $${investedAmount.toLocaleString()} | ${ownershipPctVal.toFixed(2)}%`)
    }
  }

  console.log('\n✅ Import complete!')
}

run().catch(console.error)
