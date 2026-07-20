/**
 * Stub session time estimate — see docs/24-workout-builder-spec.md §4.
 */
import type { LoadTier } from '../data/exerciseCatalog'
import type { SessionRow } from '../types/sessionBuilder'

const WORKING_SET_SECONDS = 45

/** Matches builder rest rule: 180 non-TRX, 60 low_impact. */
export const REST_BY_TIER: Record<LoadTier, number> = {
  heavy: 180,
  moderate: 180,
  low_impact: 60,
}

const WARMUP_MINUTES = 5
const CORE_MINUTES = 10
const MOBILITY_MINUTES = 10

export function estimateSessionMinutes(
  rows: SessionRow[],
  core: boolean,
  mobility: boolean,
): number {
  let seconds = WARMUP_MINUTES * 60
  for (const row of rows) {
    const rest = REST_BY_TIER[row.currentTier]
    seconds += row.sets * (WORKING_SET_SECONDS + rest)
  }
  if (core) seconds += CORE_MINUTES * 60
  if (mobility) seconds += MOBILITY_MINUTES * 60
  return Math.round(seconds / 60)
}
