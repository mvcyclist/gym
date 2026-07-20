/**
 * Auto-fit session to a time target — see docs/24-workout-builder-spec.md §5.
 */
import type { LoadTier } from '../data/exerciseCatalog'
import type { PrimaryPattern } from '../data/workoutCategories'
import { PATTERN_LABELS, restSecondsForTier } from '../data/workoutCategories'
import type { SessionRow } from '../types/sessionBuilder'
import { estimateSessionMinutes, REST_BY_TIER } from './timeEstimateService'
import { buildSlotOptions } from './recommendedWorkoutService'
import type { EquipmentProfile } from './slotResolver'
import { PATTERN_PREFERRED_IDS } from '../data/workoutCategories'

const TIER_DOWN: Record<LoadTier, LoadTier | null> = {
  heavy: 'moderate',
  moderate: 'low_impact',
  low_impact: null,
}

export interface AutoFitResult {
  core: boolean
  mobility: boolean
  changes: string[]
  rows: SessionRow[]
  removedPatterns: PrimaryPattern[]
}

function downgradeRow(row: SessionRow, profile: EquipmentProfile): SessionRow | null {
  const nextTier = TIER_DOWN[row.currentTier]
  if (!nextTier || row.forceTrx) return null

  const { groups, selected } = buildSlotOptions(
    row.patternKey,
    nextTier,
    profile,
    PATTERN_PREFERRED_IDS[row.patternKey],
  )
  if (!selected) return null

  return {
    ...row,
    currentTier: selected.loadTier ?? nextTier,
    resolvedTier: row.resolvedTier,
    catalogExerciseId: selected.id,
    currentName: selected.name,
    suggestedRestSeconds: restSecondsForTier(selected.loadTier ?? nextTier, row.forceTrx),
    options: groups,
    autoAdjusted: true,
  }
}

export function autoFitToTarget(
  rows: SessionRow[],
  target: number | null,
  profile: EquipmentProfile,
): AutoFitResult {
  let core = true
  let mobility = true
  const changes: string[] = []
  let session = rows.map((r) => ({ ...r }))
  const removedPatterns: PrimaryPattern[] = []

  if (target === null) {
    return { core, mobility, changes, rows: session, removedPatterns }
  }

  if (estimateSessionMinutes(session, core, mobility) > target) {
    mobility = false
    changes.push('Mobility off')
  }
  if (estimateSessionMinutes(session, core, mobility) > target) {
    core = false
    changes.push('Core off')
  }

  while (estimateSessionMinutes(session, core, mobility) > target) {
    const candidates = session
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => !row.forceTrx && row.currentTier !== 'low_impact')
    if (candidates.length === 0) break

    candidates.sort(
      (a, b) => REST_BY_TIER[b.row.currentTier] - REST_BY_TIER[a.row.currentTier],
    )
    const pick = candidates[0]
    const downgraded = downgradeRow(pick.row, profile)
    if (!downgraded) break
    session[pick.index] = downgraded
    changes.push(`${PATTERN_LABELS[downgraded.patternKey]} → ${downgraded.currentTier === 'low_impact' ? 'TRX' : 'Moderate'}`)
  }

  while (estimateSessionMinutes(session, core, mobility) > target && session.length > 1) {
    const dropped = session.pop()!
    removedPatterns.push(dropped.patternKey)
    changes.push(`${PATTERN_LABELS[dropped.patternKey]} removed`)
  }

  return { core, mobility, changes, rows: session, removedPatterns }
}
