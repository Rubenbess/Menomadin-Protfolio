import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit'
import type { CompanyHealth } from '@/lib/types'

/**
 * Portfolio sync endpoint for the daily Claude portfolio refresh.
 *
 *   GET  -> list companies (name, status, health) so the caller can match names.
 *   POST -> write health, company updates and notifications.
 *
 * Auth: `Authorization: Bearer <PORTFOLIO_SYNC_SECRET>`. Fails closed when the
 * secret is unset. The secret only reaches this route, which can only:
 *   - set companies.health / health_note / health_updated_at
 *   - insert company_updates (created_by = 'Claude daily refresh')
 *   - insert notifications
 * It never edits amounts, rounds, investments or cap tables, and never deletes.
 *
 * ROTATION: same as CRON_SECRET (lib/api-auth.ts): new value in Vercel env
 * vars, redeploy, then update the scheduled task.
 */

export const dynamic = 'force-dynamic'

const HEALTH_VALUES: readonly CompanyHealth[] = ['Critical', 'Watch', 'On track', 'Closing']
const CATEGORIES = ['Fundraising', 'Product', 'Team', 'Regulatory', 'Commercial', 'Other']
const AUTHOR = 'Claude daily refresh'
const MAX_ITEMS = 60
const MAX_BODY_BYTES = 200_000

interface SyncUpdate {
  title?: unknown
  notes?: unknown
  category?: unknown
  date?: unknown
}

interface SyncItem {
  company?: unknown
  aliases?: unknown
  health?: unknown
  health_note?: unknown
  update?: SyncUpdate | null
}

interface SyncAlert {
  company?: unknown
  title?: unknown
  body?: unknown
}

interface CompanyRow {
  id: string
  name: string
  status: string
  health?: CompanyHealth | null
  health_note?: string | null
}

function requireSyncAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.PORTFOLIO_SYNC_SECRET
  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: 'PORTFOLIO_SYNC_SECRET is not configured on the server' },
      { status: 503 },
    )
  }
  const given = Buffer.from(req.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

function guard(req: NextRequest): NextResponse | null {
  const authError = requireSyncAuth(req)
  if (authError) return authError
  const rl = checkRateLimit('portfolio-sync', 20, 60_000)
  if (rl) return NextResponse.json({ error: rl }, { status: 429 })
  return null
}

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '')

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

const isDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v))

const isHealth = (v: unknown): v is CompanyHealth =>
  typeof v === 'string' && (HEALTH_VALUES as readonly string[]).includes(v)

async function loadCompanies(
  supabase: SupabaseClient,
): Promise<{ rows: CompanyRow[]; healthColumn: boolean; error?: string }> {
  const withHealth = await supabase
    .from('companies')
    .select('id, name, status, health, health_note')
    .order('name')
  if (!withHealth.error) return { rows: (withHealth.data ?? []) as CompanyRow[], healthColumn: true }
  // Migration 20261011_company_health.sql not applied yet: keep working without health.
  const basic = await supabase.from('companies').select('id, name, status').order('name')
  if (basic.error) return { rows: [], healthColumn: false, error: basic.error.message }
  return { rows: (basic.data ?? []) as CompanyRow[], healthColumn: false }
}

export async function GET(req: NextRequest) {
  const blocked = guard(req)
  if (blocked) return blocked
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 503 })

  const { rows, healthColumn, error } = await loadCompanies(supabase)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({
    health_column: healthColumn,
    companies: rows.map(r => ({ name: r.name, status: r.status, health: r.health ?? null })),
  })
}

export async function POST(req: NextRequest) {
  const blocked = guard(req)
  if (blocked) return blocked
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 503 })

  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Body too large' }, { status: 413 })
  }
  let body: { date?: unknown; dry_run?: unknown; items?: unknown; alerts?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }

  if (!isDate(body.date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }
  const runDate = body.date
  const dryRun = body.dry_run === true
  const items = (Array.isArray(body.items) ? body.items : []) as SyncItem[]
  const alerts = (Array.isArray(body.alerts) ? body.alerts : []) as SyncAlert[]
  if (items.length + alerts.length > MAX_ITEMS) {
    return NextResponse.json({ error: `At most ${MAX_ITEMS} items and alerts per call` }, { status: 400 })
  }

  const { rows, healthColumn, error: loadError } = await loadCompanies(supabase)
  if (loadError) return NextResponse.json({ error: loadError }, { status: 500 })

  const byKey = new Map<string, CompanyRow>()
  for (const r of rows) byKey.set(norm(r.name), r)
  const match = (name: string | null, aliases: unknown): CompanyRow | null => {
    const keys = [name, ...(Array.isArray(aliases) ? aliases : [])]
      .filter((k): k is string => typeof k === 'string' && k.trim() !== '')
      .map(norm)
    for (const k of keys) {
      const hit = byKey.get(k)
      if (hit) return hit
    }
    return null
  }

  const result = {
    date: runDate,
    dry_run: dryRun,
    health_column: healthColumn,
    matched: [] as string[],
    unmatched: [] as string[],
    health_updated: [] as string[],
    updates_inserted: [] as string[],
    updates_skipped: [] as string[],
    notifications: 0,
    errors: [] as { company: string; stage: string; message: string }[],
  }

  const notifications: { type: string; title: string; body: string | null; company_id: string | null; link: string | null; read: boolean }[] = []

  for (const item of items) {
    const name = text(item.company, 120)
    if (!name) continue
    const co = match(name, item.aliases)
    if (!co) {
      result.unmatched.push(name)
      continue
    }
    result.matched.push(co.name)

    // Health
    if (healthColumn && isHealth(item.health)) {
      const note = text(item.health_note, 500)
      const changed = co.health !== item.health
      if (changed || (note && note !== co.health_note)) {
        if (!dryRun) {
          const { error } = await supabase
            .from('companies')
            .update({ health: item.health, health_note: note, health_updated_at: new Date().toISOString() })
            .eq('id', co.id)
          if (error) {
            result.errors.push({ company: co.name, stage: 'companies.health', message: error.message })
            continue
          }
        }
        result.health_updated.push(co.name)
        if (changed) {
          notifications.push({
            type: 'general',
            title: `${co.name} health: ${co.health ?? 'not set'} to ${item.health}`,
            body: note,
            company_id: co.id,
            link: `/companies/${co.id}`,
            read: false,
          })
        }
      }
    }

    // Company update
    const u = item.update
    const title = u ? text(u.title, 200) : null
    if (u && title) {
      const date = isDate(u.date) ? u.date : runDate
      const category = typeof u.category === 'string' && CATEGORIES.includes(u.category) ? u.category : 'Other'
      const notes = text(u.notes, 4000)

      const { data: existing, error: lookupError } = await supabase
        .from('company_updates')
        .select('id')
        .eq('company_id', co.id)
        .eq('date', date)
        .eq('title', title)
        .limit(1)
      if (lookupError) {
        result.errors.push({ company: co.name, stage: 'company_updates.lookup', message: lookupError.message })
        continue
      }
      if (existing && existing.length) {
        result.updates_skipped.push(co.name)
        continue
      }
      if (!dryRun) {
        const { error } = await supabase
          .from('company_updates')
          .insert({ company_id: co.id, date, category, title, notes, created_by: AUTHOR })
        if (error) {
          result.errors.push({ company: co.name, stage: 'company_updates.insert', message: error.message })
          continue
        }
      }
      result.updates_inserted.push(co.name)
      notifications.push({
        type: 'update_added',
        title: `${co.name}: ${title}`.slice(0, 200),
        body: notes ? notes.slice(0, 300) : null,
        company_id: co.id,
        link: `/companies/${co.id}`,
        read: false,
      })
    }
  }

  for (const a of alerts) {
    const title = text(a.title, 200)
    if (!title) continue
    const coName = text(a.company, 120)
    const co = coName ? match(coName, null) : null
    if (coName && !co) result.unmatched.push(coName)
    notifications.push({
      type: 'general',
      title,
      body: text(a.body, 300),
      company_id: co?.id ?? null,
      link: co ? `/companies/${co.id}` : null,
      read: false,
    })
  }

  if (notifications.length && !dryRun) {
    const { error } = await supabase.from('notifications').insert(notifications)
    if (error) result.errors.push({ company: '', stage: 'notifications.insert', message: error.message })
    else result.notifications = notifications.length
  } else {
    result.notifications = notifications.length
  }

  result.unmatched = [...new Set(result.unmatched)]
  return NextResponse.json(result, { status: result.errors.length ? 207 : 200 })
}
