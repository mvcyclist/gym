import { describe, expect, it } from 'vitest'
import type { CatalogExercise } from '../data/exerciseCatalog'
import type { LastExercisePerformance } from './exerciseHistoryService'
import { getProgressionRecommendation } from './sessionCoaching'

const weightedCatalog: CatalogExercise = {
  id: 'bench-press',
  name: 'Bench Press',
  coachingMode: 'weighted',
  movementClass: 'compound_upper',
  weightIncrementLbs: 5,
}

const lastPerformance: LastExercisePerformance = {
  historyExerciseKey: 'bench-press',
  keyKind: 'catalog',
  exerciseName: 'Bench Press',
  lastPerformedAt: '2026-06-22',
  sets: [{ setNumber: 1, weight: 135, reps: 10 }],
  totalReps: 10,
  topSet: { weight: 135, reps: 10 },
  totalVolume: 1350,
}

describe('getProgressionRecommendation days since last workout', () => {
  const now = new Date(2026, 6, 9, 15, 0, 0, 0)

  it('computes a valid day count (not NaN) for YYYY-MM-DD dates', () => {
    const rec = getProgressionRecommendation(weightedCatalog, lastPerformance, 3, now)
    expect(rec.daysSinceLastWorkout).toBe(17)
    expect(Number.isNaN(rec.daysSinceLastWorkout)).toBe(false)
  })
})
