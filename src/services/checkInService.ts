/**
 * Check-in → load tier (pain) and volume tier (fatigue).
 * See movement-pattern-refactor-spec.md Phase 3.
 */
import type { LoadTier, MovementPattern } from '../data/exerciseCatalog'
import type {
  BodyRegion,
  CheckIn,
  GlobalFeeling,
  RegionStatus,
  VolumeTier,
} from '../types/checkIn'

export const REGION_TO_PATTERNS: Record<BodyRegion, MovementPattern[]> = {
  knees: ['squat'],
  hips: ['squat', 'hinge'],
  lower_back: ['hinge'],
  front_shoulder: ['horizontal_push', 'vertical_push'],
  upper_back: ['horizontal_pull', 'vertical_pull'],
  elbows_wrists: ['horizontal_push', 'horizontal_pull'],
}

const GLOBAL_VOLUME_TIER: Record<Exclude<GlobalFeeling, 'skip'>, VolumeTier> = {
  good: 'full',
  meh: 'reduced',
  beat_up: 'minimal',
}

const VOLUME_ORDER: VolumeTier[] = ['full', 'reduced', 'minimal']

export const VOLUME_SET_COUNT: Record<VolumeTier, (templateSets: number) => number> = {
  full: (s) => s,
  reduced: (s) => Math.max(1, s - 1),
  minimal: () => 1,
}

export const VOLUME_LOAD_FACTOR: Record<VolumeTier, number> = {
  full: 1.0,
  reduced: 0.9,
  minimal: 0.75,
}

function gatingRegionsForPattern(pattern: MovementPattern): BodyRegion[] {
  return (Object.entries(REGION_TO_PATTERNS) as Array<[BodyRegion, MovementPattern[]]>)
    .filter(([, patterns]) => patterns.includes(pattern))
    .map(([region]) => region)
}

/** Pain axis only — sore does not downgrade load tier. */
export function resolveLoadTier(
  pattern: MovementPattern,
  regions: Record<BodyRegion, RegionStatus>,
): LoadTier {
  if (pattern === 'accessory') return 'heavy'

  let tier: LoadTier = 'heavy'
  for (const region of gatingRegionsForPattern(pattern)) {
    const status = regions[region]
    if (status === 'achy') tier = 'low_impact'
    else if (status === 'stiff' && tier !== 'low_impact') tier = 'moderate'
  }
  return tier
}

/** Fatigue axis — global feeling + localized sore. */
export function resolveVolumeTier(
  pattern: MovementPattern,
  global: Exclude<GlobalFeeling, 'skip'>,
  regions: Record<BodyRegion, RegionStatus>,
): VolumeTier {
  let tier = GLOBAL_VOLUME_TIER[global]
  if (pattern === 'accessory') return tier

  for (const region of gatingRegionsForPattern(pattern)) {
    if (regions[region] === 'sore') {
      tier = VOLUME_ORDER[Math.min(VOLUME_ORDER.indexOf(tier) + 1, 2)]
    }
  }
  return tier
}

export function sessionVolumeSummary(checkIn: CheckIn): string {
  if (checkIn.global === 'skip') return 'Take a rest day'
  const volume = GLOBAL_VOLUME_TIER[checkIn.global]
  if (volume === 'full') return 'Good to go — full volume'
  if (volume === 'reduced') return 'Dialed back — reduced volume'
  return 'Easy day — minimal volume'
}

export function isSkipCheckIn(checkIn: CheckIn): boolean {
  return checkIn.global === 'skip'
}
