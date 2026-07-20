import type { LoadTier } from '../data/exerciseCatalog'
import type { BuilderCategoryId, PrimaryPattern } from '../data/workoutCategories'
import type { TierOptionGroup } from '../services/recommendedWorkoutService'

export interface SessionRow {
  patternKey: PrimaryPattern
  patternLabel: string
  catalogExerciseId: string
  currentName: string
  currentTier: LoadTier
  /** Check-in ceiling — never raised after build. */
  resolvedTier: LoadTier
  sets: number
  reps: string
  suggestedRestSeconds: number
  forceTrx: boolean
  autoAdjusted: boolean
  options: TierOptionGroup[]
}

export interface SessionState {
  category: BuilderCategoryId
  timeTarget: number | null
  rows: SessionRow[]
  removedPatterns: PrimaryPattern[]
  core: boolean
  mobility: boolean
  autofitChanges: string[]
}
