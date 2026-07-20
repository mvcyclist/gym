/**
 * Binary check-in → load tier + set count.
 * See docs/21-checkin-binary-model.md.
 */
import type { LoadTier, MovementPattern } from '../data/exerciseCatalog'
import type { BodyRegion, CheckIn, RegionStatus } from '../types/checkIn'

export const REGION_TO_PATTERNS: Record<BodyRegion, MovementPattern[]> = {
  knees: ['squat'],
  hips: ['squat', 'hinge'],
  lower_back: ['hinge'],
  front_shoulder: ['horizontal_push', 'vertical_push'],
  upper_back: ['horizontal_pull', 'vertical_pull'],
  elbows_wrists: ['horizontal_push', 'horizontal_pull'],
}

function anyRegionBothering(regions: Record<BodyRegion, RegionStatus>): boolean {
  return Object.values(regions).some((status) => status === 'bothering')
}

function gatingRegionsForPattern(pattern: MovementPattern): BodyRegion[] {
  return (Object.entries(REGION_TO_PATTERNS) as Array<[BodyRegion, MovementPattern[]]>)
    .filter(([, patterns]) => patterns.includes(pattern))
    .map(([region]) => region)
}

/** Vague = not_100 with every region fine. Specific = at least one bothering. */
export function isVagueNot100(checkIn: CheckIn): boolean {
  return checkIn.global === 'not_100' && !anyRegionBothering(checkIn.regions)
}

export function isSpecificNot100(checkIn: CheckIn): boolean {
  return checkIn.global === 'not_100' && anyRegionBothering(checkIn.regions)
}

/**
 * Pattern load tier from the binary model.
 * Accessories must not call this — use the accessory branch in recommendedWorkoutService.
 */
export function resolveLoadTier(
  pattern: Exclude<MovementPattern, 'accessory'>,
  checkIn: CheckIn,
): LoadTier {
  if (checkIn.global === '100') return 'heavy'
  if (checkIn.global === 'skip') return 'heavy'

  if (!anyRegionBothering(checkIn.regions)) return 'moderate'

  const patternBothered = gatingRegionsForPattern(pattern).some(
    (region) => checkIn.regions[region] === 'bothering',
  )
  return patternBothered ? 'low_impact' : 'heavy'
}

/**
 * Set count for a slot. Reads template default — never hardcodes 2.
 * Same three-way split for pattern and accessory slots (vague → 1; else template).
 */
export function resolveSets(checkIn: CheckIn, templateSets: number): number {
  const base = Number.isFinite(templateSets) && templateSets >= 1 ? Math.floor(templateSets) : 1
  if (checkIn.global === '100') return base
  if (checkIn.global === 'skip') return base

  if (!anyRegionBothering(checkIn.regions)) return 1
  return base
}

export function parseTemplateSets(sets: string): number {
  const parsed = parseInt(sets, 10)
  return Number.isNaN(parsed) || parsed < 1 ? 3 : parsed
}

export function sessionVolumeSummary(checkIn: CheckIn): string {
  if (checkIn.global === 'skip') return 'Take a rest day'
  if (checkIn.global === '100') return '100% — full weight, full volume'
  if (isVagueNot100(checkIn)) {
    return 'Not 100%, nothing specific — dialed back everywhere'
  }
  return 'Not 100%, but you named it — full volume, adjusted only where it hurts'
}

export function isSkipCheckIn(checkIn: CheckIn): boolean {
  return checkIn.global === 'skip'
}

/** Tiers at or more conservative than the resolved tier (never less conservative). */
export function allowedOverrideTiers(resolvedTier: LoadTier): LoadTier[] {
  const order: LoadTier[] = ['heavy', 'moderate', 'low_impact']
  const start = order.indexOf(resolvedTier)
  return start < 0 ? [resolvedTier] : order.slice(start)
}
