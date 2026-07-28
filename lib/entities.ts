/**
 * Investing vehicles, and the mandate a position was taken under.
 *
 * `companies.strategy` is CHECK-constrained to 'impact' | 'venture' and
 * describes the MANDATE. The Excel trackers record the legal ENTITY that wrote
 * the cheque (MIF / MII / MHAG / Miles / David Taib). Those are different
 * dimensions, and mandate is not always derivable from entity — see
 * MANDATE_BY_ENTITY.
 */

export type Mandate = 'impact' | 'venture'

/**
 * Spellings each vehicle appears under, across the trackers, the cap tables and
 * `investments.legal_entity` (which is free text, not a foreign key).
 */
export const ENTITY_ALIASES: Record<string, readonly string[]> = {
  MIF: ['MIF', 'Menomadin Impact Fund'],
  MII: ['MII', 'Menomadin Impact Investments', 'Menomadin Impact Investments and Management'],
  MHAG: ['MHAG', 'MAG', 'Menomadin AG', 'Menomadin Holdings AG'],
  Miles: ['Miles', 'Miles Holdings'],
  DavidTaib: ['David Taib', 'David_Taib', 'DavidTaib'],
} as const

/**
 * Mandate per vehicle, where the vehicle actually determines it.
 *
 * MIF, MII and Miles were single-mandate impact vehicles. MHAG became the sole
 * investing vehicle in 2026 and deploys BOTH mandates; David Taib invests
 * personally alongside the group. For those two the entity tells us nothing, so
 * `null` means "ask the sector instead".
 *
 * The previous implementation was `entity.includes('MIF') ? 'impact' : 'venture'`,
 * which labelled MII, Miles, MHAG and David Taib as venture — i.e. every 2026
 * position and both of the other impact vehicles.
 */
const MANDATE_BY_ENTITY: Record<string, Mandate | null> = {
  MIF: 'impact',
  MII: 'impact',
  Miles: 'impact',
  MHAG: null,
  DavidTaib: null,
}

/**
 * Sector fragments covered by the Impact mandate, per the platform definition
 * approved 29 April 2026: HealthTech, Education, CleanTech/Energy, AgriTech,
 * plus FoodTech and Accessibility. Matched as substrings because `companies.sector`
 * is free text.
 */
const IMPACT_SECTOR_FRAGMENTS = [
  'health', 'medtech', 'medical', 'biotech', 'digital health',
  'education', 'edtech',
  'clean', 'energy', 'water', 'climate', 'environment',
  'agri', 'food',
  'accessibility', 'impact',
] as const

/** Resolve any spelling of a vehicle to its canonical key, or null if unknown. */
export function normalizeEntity(raw: string | null | undefined): string | null {
  if (!raw) return null
  const needle = raw.trim().toLowerCase()
  if (!needle) return null
  for (const [key, aliases] of Object.entries(ENTITY_ALIASES)) {
    if (aliases.some(a => a.toLowerCase() === needle)) return key
  }
  // Fall back to a token match so "MHAG " or "Menomadin AG (Liechtenstein)" resolve.
  for (const [key, aliases] of Object.entries(ENTITY_ALIASES)) {
    if (aliases.some(a => needle.includes(a.toLowerCase()))) return key
  }
  return null
}

/** True when the sector falls inside the Impact mandate. */
export function isImpactSector(sector: string | null | undefined): boolean {
  if (!sector) return false
  const s = sector.trim().toLowerCase()
  return IMPACT_SECTOR_FRAGMENTS.some(f => s.includes(f))
}

/**
 * Mandate for a position. Uses the vehicle where it is decisive, otherwise the
 * sector. Defaults to 'venture' only when neither is informative — which is a
 * guess, so callers importing in bulk should surface it rather than swallow it
 * (see `mandateIsInferred`).
 */
export function mandateForEntity(
  entity: string | null | undefined,
  sector?: string | null,
): Mandate {
  const key = normalizeEntity(entity)
  if (key) {
    const fromEntity = MANDATE_BY_ENTITY[key]
    if (fromEntity) return fromEntity
  }
  return isImpactSector(sector) ? 'impact' : 'venture'
}

/**
 * True when `mandateForEntity` had to fall back to the sector (or to the
 * 'venture' default) because the vehicle was ambiguous or unrecognised. Import
 * paths use this to flag rows a human should confirm.
 */
export function mandateIsInferred(entity: string | null | undefined): boolean {
  const key = normalizeEntity(entity)
  return key === null || MANDATE_BY_ENTITY[key] === null
}
