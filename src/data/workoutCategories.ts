import type { MovementPattern } from './exerciseCatalog'
import type { LoadTier } from './exerciseCatalog'
import type { WorkoutCategory } from '../types/workout'

export type BuilderCategoryId =
  | 'full_body'
  | 'push'
  | 'pull'
  | 'leg'
  | 'upper'
  | 'trx'

export type PrimaryPattern = Exclude<MovementPattern, 'accessory'>

export interface CategoryDef {
  id: BuilderCategoryId
  label: string
  patterns: PrimaryPattern[]
  /** TRX Day: force low_impact and skip check-in. */
  forceTier?: LoadTier
  skipCheckIn?: boolean
  subtitle: string
}

export const PATTERN_LABELS: Record<PrimaryPattern, string> = {
  squat: 'Squat',
  hinge: 'Hinge',
  horizontal_push: 'Horizontal Push',
  horizontal_pull: 'Horizontal Pull',
  vertical_push: 'Vertical Push',
  vertical_pull: 'Vertical Pull',
}

export const PATTERN_REPS: Record<PrimaryPattern, string> = {
  squat: '6–10',
  hinge: '6–10',
  horizontal_push: '6–10',
  horizontal_pull: '6–10',
  vertical_push: '6–10',
  vertical_pull: '5–10',
}

/** Preferred classic defaults when still in the allowed pool. */
export const PATTERN_PREFERRED_IDS: Record<PrimaryPattern, string> = {
  squat: 'barbell_back_squat',
  hinge: 'barbell_romanian_deadlift',
  horizontal_push: 'barbell_bench_press',
  horizontal_pull: 'barbell_rows',
  vertical_push: 'overhead_press',
  vertical_pull: 'pull_ups',
}

const ALL_SIX: PrimaryPattern[] = [
  'squat',
  'hinge',
  'horizontal_push',
  'horizontal_pull',
  'vertical_push',
  'vertical_pull',
]

export const BUILDER_CATEGORIES: CategoryDef[] = [
  {
    id: 'full_body',
    label: 'Full Body',
    patterns: ALL_SIX,
    subtitle: 'All six movement patterns',
  },
  {
    id: 'push',
    label: 'Push',
    patterns: ['horizontal_push', 'vertical_push'],
    subtitle: 'Chest, shoulders, triceps',
  },
  {
    id: 'pull',
    label: 'Pull',
    patterns: ['horizontal_pull', 'vertical_pull'],
    subtitle: 'Back, biceps, rear delts',
  },
  {
    id: 'leg',
    label: 'Leg',
    patterns: ['squat', 'hinge'],
    subtitle: 'Quads, hamstrings, glutes',
  },
  {
    id: 'upper',
    label: 'Upper Push-Pull',
    patterns: ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull'],
    subtitle: 'Upper body push + pull',
  },
  {
    id: 'trx',
    label: 'TRX Day',
    patterns: ALL_SIX,
    forceTier: 'low_impact',
    skipCheckIn: true,
    subtitle: 'Bodyweight, low impact',
  },
]

export function getBuilderCategory(id: BuilderCategoryId): CategoryDef {
  const found = BUILDER_CATEGORIES.find((c) => c.id === id)
  if (!found) throw new Error(`Unknown builder category: ${id}`)
  return found
}

/** Map builder category to ledger workout type. */
export function toLedgerWorkoutCategory(id: BuilderCategoryId): WorkoutCategory {
  if (id === 'push' || id === 'pull' || id === 'leg') return id
  return 'full_body'
}

export function restSecondsForTier(tier: LoadTier, forceTrx = false): number {
  return forceTrx || tier === 'low_impact' ? 60 : 180
}
