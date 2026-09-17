import { describe, it, expect } from 'vitest'
import { getFieldsForEntity, applyFilters, createFilterGroup } from '@/lib/filter-utils'
import { normalizeSector } from '@/lib/calculations'
import type { CompanyStatus } from '@/lib/types'

// The advanced filter panel compares option ids against stored values with
// STRICT equality (`===`). When an option id drifts from the persisted domain
// the filter silently returns zero rows rather than erroring — on a portfolio
// screen that reads as "we have no healthtech investments". These tests lock
// each select field's option ids to the domain the database actually stores.

function optionIds(entity: string, fieldId: string): string[] {
  const field = getFieldsForEntity(entity).find((f) => f.id === fieldId)
  expect(field, `${entity}.${fieldId} field must exist`).toBeDefined()
  return (field!.options ?? []).map((o) => o.id)
}

describe('company status filter options', () => {
  // Mirrors the companies.status CHECK constraint in schema.sql.
  const DOMAIN: CompanyStatus[] = ['active', 'exited', 'written-off', 'watchlist']

  it('offers exactly the statuses the schema permits', () => {
    expect(optionIds('company', 'status').sort()).toEqual([...DOMAIN].sort())
  })

  it('does not offer the non-existent "closed" status', () => {
    expect(optionIds('company', 'status')).not.toContain('closed')
  })

  it('actually matches a stored row', () => {
    const group = createFilterGroup('and')
    group.conditions.push({
      id: 'c1', field: 'status', operator: 'eq', value: 'written-off',
    })
    const rows = [{ status: 'written-off' }, { status: 'active' }]
    expect(applyFilters(rows, group)).toEqual([{ status: 'written-off' }])
  })
})

describe('company sector filter options', () => {
  it('uses ids that survive normalizeSector unchanged', () => {
    for (const id of optionIds('company', 'sector')) {
      expect(normalizeSector(id), `sector option "${id}" is not canonical`).toBe(id)
    }
  })

  it('matches a stored, normalized sector value', () => {
    const group = createFilterGroup('and')
    group.conditions.push({ id: 'c1', field: 'sector', operator: 'eq', value: 'Healthtech' })
    const rows = [{ sector: normalizeSector('health tech') }, { sector: 'SaaS' }]
    expect(applyFilters(rows, group)).toHaveLength(1)
    expect(optionIds('company', 'sector')).toContain('Healthtech')
  })
})

describe('company entry_stage filter options', () => {
  it('uses display-cased ids, not snake_case', () => {
    const ids = optionIds('company', 'entry_stage')
    expect(ids).toContain('Series A')
    expect(ids).not.toContain('series_a')
  })
})

describe('contact type filter options', () => {
  // Mirrors the contacts.contact_type CHECK constraint in
  // supabase/migrations/contacts.sql.
  const DOMAIN = ['Founder', 'Advisor', 'Co-investor', 'Service Provider', 'Other']

  it('offers exactly the contact types the schema permits', () => {
    expect(optionIds('contact', 'contact_type').sort()).toEqual([...DOMAIN].sort())
  })

  it('does not offer types that cannot exist', () => {
    const ids = optionIds('contact', 'contact_type')
    expect(ids).not.toContain('executive')
    expect(ids).not.toContain('investor')
    expect(ids).not.toContain('service_provider')
  })
})
