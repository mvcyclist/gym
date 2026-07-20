/**
 * Assemble SessionRow[] from builder category + check-in.
 */
import type { CheckIn } from '../types/checkIn'
import type { SessionRow } from '../types/sessionBuilder'
import type { Exercise, WorkoutCategory } from '../types/workout'
import {
  getBuilderCategory,
  PATTERN_LABELS,
  PATTERN_PREFERRED_IDS,
  PATTERN_REPS,
  restSecondsForTier,
  toLedgerWorkoutCategory,
  type BuilderCategoryId,
  type PrimaryPattern,
} from '../data/workoutCategories'
import { emptyCheckInRegions } from '../types/checkIn'
import {
  resolveLoadTier,
  resolveSets,
} from './checkInService'
import { buildSlotOptions } from './recommendedWorkoutService'
import type { EquipmentProfile } from './slotResolver'
import { getUserProfile } from './userProfileRepository'

const DEFAULT_TEMPLATE_SETS = 2

export function buildSessionRows(
  categoryId: BuilderCategoryId,
  checkIn: CheckIn,
  profile: EquipmentProfile = {
    equipment: getUserProfile().equipment,
    canBench: getUserProfile().canBench,
  },
): SessionRow[] {
  const category = getBuilderCategory(categoryId)
  const forceTrx = Boolean(category.forceTier === 'low_impact' || category.skipCheckIn)
  const effectiveCheckIn: CheckIn = forceTrx
    ? { global: '100', regions: emptyCheckInRegions() }
    : checkIn

  const rows: SessionRow[] = []

  for (const pattern of category.patterns) {
    const resolvedTier = forceTrx
      ? 'low_impact'
      : resolveLoadTier(pattern, effectiveCheckIn)

    const { groups, selected } = buildSlotOptions(
      pattern,
      resolvedTier,
      profile,
      PATTERN_PREFERRED_IDS[pattern],
    )
    if (!selected) continue

    const currentTier = selected.loadTier ?? resolvedTier
    const sets = forceTrx
      ? DEFAULT_TEMPLATE_SETS
      : resolveSets(effectiveCheckIn, DEFAULT_TEMPLATE_SETS)

    rows.push({
      patternKey: pattern,
      patternLabel: PATTERN_LABELS[pattern],
      catalogExerciseId: selected.id,
      currentName: selected.name,
      currentTier,
      resolvedTier,
      sets,
      reps: PATTERN_REPS[pattern],
      suggestedRestSeconds: restSecondsForTier(currentTier, forceTrx),
      forceTrx,
      autoAdjusted: false,
      options: groups,
    })
  }

  return rows
}

export function sessionRowsToExercises(
  rows: SessionRow[],
  ledgerCategory: WorkoutCategory,
): Exercise[] {
  return rows.map((row, index) => ({
    id: `${ledgerCategory}-${index + 1}`,
    catalogExerciseId: row.catalogExerciseId,
    name: row.currentName,
    primaryMuscles: [row.patternLabel],
    equipment: '—',
    sets: String(row.sets),
    reps: row.reps,
    suggestedRestSeconds: row.suggestedRestSeconds,
    instructions: 'Instructions will go here.',
    cues: 'Coaching cues will go here.',
    commonMistakes: 'Common mistakes will go here.',
  }))
}

export function reResolveRemovedPattern(
  pattern: PrimaryPattern,
  categoryId: BuilderCategoryId,
  checkIn: CheckIn,
  profile: EquipmentProfile,
): SessionRow | null {
  const category = getBuilderCategory(categoryId)
  if (!category.patterns.includes(pattern)) return null
  const rows = buildSessionRows(categoryId, checkIn, profile)
  return rows.find((r) => r.patternKey === pattern) ?? null
}

export { toLedgerWorkoutCategory }
