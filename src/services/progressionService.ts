import { getLastExercisePerformance } from './exerciseHistoryService'
import type { ParsedWeight } from '../utils/setParsing'

export type ExerciseCategory = 'compound-upper' | 'compound-lower' | 'isolation-upper' | 'isolation-lower' | 'bodyweight'

// Weight increment per category (lbs)
const INCREMENTS: Record<ExerciseCategory, number> = {
  'compound-upper': 5,
  'compound-lower': 10,
  'isolation-upper': 2.5,
  'isolation-lower': 5,
  'bodyweight': 0,
}

const EXERCISE_CATEGORIES: Record<string, ExerciseCategory> = {
  barbell_bench_press: 'compound-upper',
  overhead_press: 'compound-upper',
  inclined_barbell_press: 'compound-upper',
  pull_ups: 'compound-upper',
  barbell_rows: 'compound-upper',
  single_dumbbell_arm_rows: 'compound-upper',
  barbell_back_squat: 'compound-lower',
  barbell_hip_thrust: 'compound-lower',
  trx_weighted_lunge: 'compound-lower',
  dumbbell_pullover: 'isolation-upper',
  lateral_raises: 'isolation-upper',
  trx_rear_delt_fly: 'isolation-upper',
  barbell_curls: 'isolation-upper',
  barbell_reverse_curls: 'isolation-upper',
  overhead_db_tricep_extension: 'isolation-upper',
  trx_tricep_extension: 'isolation-upper',
  trx_hamstring_curl: 'isolation-lower',
  standing_calf_raise: 'isolation-lower',
  // Bodyweight — progression is reps/difficulty, not weight
  atomic_push_up: 'bodyweight',
  close_grip_push_ups: 'bodyweight',
  trx_pike: 'bodyweight',
  trx_core_1: 'bodyweight',
  trx_core_2: 'bodyweight',
  trx_core_3: 'bodyweight',
  trx_side_tuck: 'bodyweight',
  plank: 'bodyweight',
  side_plank: 'bodyweight',
  dead_bug: 'bodyweight',
  hollow_hold: 'bodyweight',
  mountain_climber: 'bodyweight',
  pallof_press: 'bodyweight',
}

export interface ProgressionSuggestion {
  lastWeight: ParsedWeight
  lastRepsPerSet: number
  suggestedWeight: ParsedWeight
  suggestedReps: string
  note: 'increase' | 'hold' | 'deload' | 'reset'
}

function parseRepTarget(reps: string): number | null {
  // Extract the upper bound from a range like "6–10", "8-10", or a single "10"
  const match = reps.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (match) return Number(match[2])
  const single = reps.match(/(\d+)/)
  return single ? Number(single[1]) : null
}

function roundToIncrement(weight: number, increment: number): number {
  if (increment === 0) return weight
  return Math.round(weight / increment) * increment
}

function formatWeight(w: ParsedWeight): string {
  if (w === 'BW') return 'BW'
  return `${w} lbs`
}

export function getExerciseSuggestion(
  catalogExerciseId: string,
  targetSets: number,
  targetReps: string,
): ProgressionSuggestion | null {
  const category = EXERCISE_CATEGORIES[catalogExerciseId]

  // Skip bodyweight and unknown exercises
  if (!category || category === 'bodyweight') return null

  const performance = getLastExercisePerformance(catalogExerciseId)
  if (!performance || !performance.topSet || performance.sets.length === 0) return null

  const topSet = performance.topSet
  if (topSet.weight === 'BW' || typeof topSet.weight !== 'number') return null

  const repTarget = parseRepTarget(targetReps)
  if (repTarget === null) return null

  const increment = INCREMENTS[category]
  const lastPerformedAt = new Date(performance.lastPerformedAt)
  const daysSince = Math.round((Date.now() - lastPerformedAt.getTime()) / (1000 * 60 * 60 * 24))

  // Typical reps per set from history (median of completed sets)
  const avgReps = Math.round(performance.totalReps / performance.sets.length)

  // Case 4: stale session (>14 days)
  if (daysSince > 14) {
    const resetWeight = roundToIncrement(topSet.weight * 0.9, increment === 2.5 ? 2.5 : 5)
    return {
      lastWeight: topSet.weight,
      lastRepsPerSet: avgReps,
      suggestedWeight: resetWeight,
      suggestedReps: targetReps,
      note: 'reset',
    }
  }

  // Count sets that hit the target rep count
  const setsHitTarget = performance.sets.filter((s) => s.reps >= repTarget).length

  // Case 1: all sets hit target → increase weight
  if (setsHitTarget >= targetSets) {
    return {
      lastWeight: topSet.weight,
      lastRepsPerSet: avgReps,
      suggestedWeight: topSet.weight + increment,
      suggestedReps: targetReps,
      note: 'increase',
    }
  }

  // Case 2: all but one set hit target → hold, same reps
  if (setsHitTarget >= targetSets - 1) {
    return {
      lastWeight: topSet.weight,
      lastRepsPerSet: avgReps,
      suggestedWeight: topSet.weight,
      suggestedReps: targetReps,
      note: 'hold',
    }
  }

  // Case 3: multiple sets missed → hold weight, reduce reps slightly
  const lowerBoundMatch = targetReps.match(/(\d+)/)
  const lowerBound = lowerBoundMatch ? Number(lowerBoundMatch[1]) : Math.max(1, repTarget - 2)
  const reducedReps = Math.max(lowerBound, repTarget - 2)
  const repRange = reducedReps === repTarget ? targetReps : `${reducedReps}–${repTarget}`

  return {
    lastWeight: topSet.weight,
    lastRepsPerSet: avgReps,
    suggestedWeight: topSet.weight,
    suggestedReps: repRange,
    note: 'deload',
  }
}

export function formatProgressionHint(suggestion: ProgressionSuggestion): {
  lastTime: string
  suggested: string
  noteLabel: string
} {
  const lastTime = `${formatWeight(suggestion.lastWeight)} × ${suggestion.lastRepsPerSet}`
  const suggested = `${formatWeight(suggestion.suggestedWeight)} × ${suggestion.suggestedReps}`

  const noteLabel =
    suggestion.note === 'increase' ? '↑ ready to progress'
    : suggestion.note === 'reset' ? 'conservative reset'
    : suggestion.note === 'deload' ? 'work up to it'
    : ''

  return { lastTime, suggested, noteLabel }
}
