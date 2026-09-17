/**
 * Advanced filtering utilities for companies, contacts, investments, etc.
 */

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'between'
export type FilterLogic = 'and' | 'or'

export interface FilterCondition {
  id: string
  field: string
  operator: FilterOperator
  value: any
  valueTo?: any // for 'between' operator
}

export interface FilterGroup {
  id: string
  logic: FilterLogic
  conditions: FilterCondition[]
  groups?: FilterGroup[]
}

export interface SavedFilter {
  id: string
  name: string
  description?: string
  filterGroup: FilterGroup
  entityType: 'company' | 'contact' | 'investment'
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Apply filters to an array of objects
 */
export function applyFilters<T extends Record<string, any>>(
  data: T[],
  filterGroup: FilterGroup
): T[] {
  return data.filter((item) => evaluateGroup(item, filterGroup))
}

/**
 * Evaluate a filter group against an item
 */
function evaluateGroup<T extends Record<string, any>>(
  item: T,
  group: FilterGroup
): boolean {
  const conditionResults = group.conditions.map((condition) =>
    evaluateCondition(item, condition)
  )

  const groupResults = (group.groups || []).map((subGroup) =>
    evaluateGroup(item, subGroup)
  )

  const allResults = [...conditionResults, ...groupResults]

  if (group.logic === 'and') {
    return allResults.every((result) => result === true)
  } else {
    return allResults.some((result) => result === true)
  }
}

/**
 * Evaluate a single condition against an item
 */
function evaluateCondition<T extends Record<string, any>>(
  item: T,
  condition: FilterCondition
): boolean {
  const value = getNestedValue(item, condition.field)

  switch (condition.operator) {
    case 'eq':
      return value === condition.value
    case 'neq':
      return value !== condition.value
    case 'gt':
      return value > condition.value
    case 'lt':
      return value < condition.value
    case 'gte':
      return value >= condition.value
    case 'lte':
      return value <= condition.value
    case 'contains':
      return String(value).toLowerCase().includes(String(condition.value).toLowerCase())
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value)
    case 'between':
      return value >= condition.value && value <= condition.valueTo
    default:
      return true
  }
}

/**
 * Canonical sector names as produced by `normalizeSector` in lib/calculations.ts.
 * Filter option ids are compared with strict equality against the stored value,
 * so these must stay in sync with SECTOR_ALIASES' canonical forms.
 */
const CANONICAL_SECTORS = [
  'Cleantech',
  'Consumer',
  'Deep Tech',
  'Fintech',
  'Healthtech',
  'Marketplace',
  'SaaS',
  'Other',
] as const

/**
 * Get nested object value by dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

/**
 * Get field options for a given entity type
 */
export function getFieldsForEntity(entityType: string): Array<{
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'multi-select'
  operators: FilterOperator[]
  options?: Array<{ id: string; label: string }>
}> {
  switch (entityType) {
    case 'company':
      return [
        {
          id: 'name',
          label: 'Company Name',
          type: 'text',
          operators: ['eq', 'neq', 'contains'],
        },
        {
          id: 'sector',
          label: 'Sector',
          type: 'select',
          operators: ['eq', 'neq', 'in'],
          // Option ids MUST equal the values actually persisted in
          // companies.sector, which are canonicalised by normalizeSector()
          // in lib/calculations.ts. The previous ids ('tech', 'healthcare',
          // ...) matched nothing, so every sector filter returned 0 rows.
          options: CANONICAL_SECTORS.map((s) => ({ id: s, label: s })),
        },
        {
          id: 'status',
          label: 'Status',
          type: 'select',
          operators: ['eq', 'neq', 'in'],
          // Mirrors the companies.status CHECK constraint in schema.sql and
          // the CompanyStatus union in lib/types.ts. 'closed' is not a valid
          // status and matched nothing; 'written-off' and 'watchlist' were
          // missing, so the two statuses that matter most for portfolio
          // review could not be filtered at all.
          options: [
            { id: 'active', label: 'Active' },
            { id: 'exited', label: 'Exited' },
            { id: 'written-off', label: 'Written Off' },
            { id: 'watchlist', label: 'Watchlist' },
          ],
        },
        {
          id: 'entry_stage',
          label: 'Entry Stage',
          type: 'select',
          operators: ['eq', 'neq', 'in'],
          // companies.entry_stage is free text with no CHECK constraint and is
          // rendered verbatim in the UI, so the ids must be the display
          // strings themselves. The previous snake_case ids ('series_a') never
          // matched a stored value.
          options: [
            { id: 'Pre-Seed', label: 'Pre-Seed' },
            { id: 'Seed', label: 'Seed' },
            { id: 'Series A', label: 'Series A' },
            { id: 'Series B', label: 'Series B' },
            { id: 'Series C', label: 'Series C' },
            { id: 'Growth', label: 'Growth' },
          ],
        },
        {
          id: 'totalInvested',
          label: 'Total Invested',
          type: 'number',
          operators: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'between'],
        },
        {
          id: 'moic',
          label: 'MOIC',
          type: 'number',
          operators: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'between'],
        },
      ]
    case 'contact':
      return [
        {
          id: 'name',
          label: 'Name',
          type: 'text',
          operators: ['eq', 'neq', 'contains'],
        },
        {
          id: 'email',
          label: 'Email',
          type: 'text',
          operators: ['eq', 'neq', 'contains'],
        },
        {
          id: 'company_name',
          label: 'Company',
          type: 'text',
          operators: ['eq', 'neq', 'contains'],
        },
        {
          id: 'contact_type',
          label: 'Contact Type',
          type: 'select',
          operators: ['eq', 'neq', 'in'],
          // Mirrors the contacts.contact_type CHECK constraint in
          // supabase/migrations/contacts.sql. Every previous id was lowercase
          // /snake_case and matched nothing; 'executive' and 'investor' are
          // not valid types at all, and 'Co-investor' was missing.
          options: [
            { id: 'Founder', label: 'Founder' },
            { id: 'Advisor', label: 'Advisor' },
            { id: 'Co-investor', label: 'Co-investor' },
            { id: 'Service Provider', label: 'Service Provider' },
            { id: 'Other', label: 'Other' },
          ],
        },
      ]
    default:
      return []
  }
}

/**
 * Create a new filter condition
 */
export function createFilterCondition(
  field: string,
  operator: FilterOperator = 'eq',
  value: any = ''
): FilterCondition {
  return {
    id: generateId(),
    field,
    operator,
    value,
  }
}

/**
 * Create a new filter group
 */
export function createFilterGroup(logic: FilterLogic = 'and'): FilterGroup {
  return {
    id: generateId(),
    logic,
    conditions: [],
    groups: [],
  }
}

/**
 * Add condition to a group
 */
export function addConditionToGroup(
  group: FilterGroup,
  condition: FilterCondition
): FilterGroup {
  return {
    ...group,
    conditions: [...group.conditions, condition],
  }
}

/**
 * Remove condition from group
 */
export function removeConditionFromGroup(
  group: FilterGroup,
  conditionId: string
): FilterGroup {
  return {
    ...group,
    conditions: group.conditions.filter((c) => c.id !== conditionId),
  }
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Convert filter group to readable string
 */
export function filterGroupToString(group: FilterGroup): string {
  if (group.conditions.length === 0) {
    return 'No filters'
  }

  const conditionStrings = group.conditions.map(
    (c) => `${c.field} ${c.operator} ${c.value}`
  )

  return conditionStrings.join(` ${group.logic.toUpperCase()} `)
}
