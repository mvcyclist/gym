/**
 * Progression recommendation — spec 5-case model (replaces progressiveOverloadEngine v2).
 *
 * Pure function over getLastExercisePerformance output + catalog coaching profile.
 */
import type { CatalogExercise } from '../data/exerciseCatalog'
import { getRepRangeForCatalog } from '../data/exerciseCatalog'
import type { LastExercisePerformance } from './exerciseHistoryService'

export type ProgressionCase = 1 | 2 | 3 | 4 | 5

export interface ProgressionRecommendation {
  case: ProgressionCase
  repFloor: number
  repCeiling: number
  targetSets: number
  suggestedWeightLbs: number | null
  previousWeightLbs: number | null
  lastWorkoutLines: string[]
  daysSinceLastWorkout: number | null
  coachingMain: string
  coachingSub: string
  displayReason: string
}

const STALE_DAYS = 14

function daysSince(isoDate: string, now: Date): number {
  const then = new Date(isoDate + 'T12:00:00')
  const today = new Date(now.toDateString() + 'T12:00:00')
  return Math.floor((today.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
}

function formatSetLine(weight: number | 'BW', reps: number): string {
  if (weight === 'BW') return `BW × ${reps}`
  return `${weight} × ${reps}`
}

function roundDownToIncrement(weight: number, increment: number): number {
  if (increment <= 0) return weight
  return Math.floor(weight / increment) * increment
}

function numericWeight(weight: number | 'BW'): number | null {
  return typeof weight === 'number' ? weight : null
}

function evaluateCase(
  reps: number[],
  repCeiling: number,
): 1 | 2 | 3 {
  if (reps.length === 0) return 2

  const firstSetReps = reps[0]
  const threshold = repCeiling - 1

  const hasSignificantDrop = reps.some(
    (rep) => firstSetReps > 0 && rep < firstSetReps * 0.75,
  )
  if (hasSignificantDrop) return 3

  const allAtThreshold = reps.every((rep) => rep >= threshold)
  if (allAtThreshold) return 1

  return 2
}

function buildFirstSession(
  repFloor: number,
  repCeiling: number,
  targetSets: number,
): ProgressionRecommendation {
  return {
    case: 5,
    repFloor,
    repCeiling,
    targetSets,
    suggestedWeightLbs: null,
    previousWeightLbs: null,
    lastWorkoutLines: [],
    daysSinceLastWorkout: null,
    coachingMain: 'First session',
    coachingSub: 'Find a challenging weight and log your baseline.',
    displayReason: 'First session — find a challenging weight and establish a baseline.',
  }
}

function buildTimeCoaching(exerciseName: string): ProgressionRecommendation {
  return {
    case: 5,
    repFloor: 0,
    repCeiling: 0,
    targetSets: 3,
    suggestedWeightLbs: null,
    previousWeightLbs: null,
    lastWorkoutLines: [],
    daysSinceLastWorkout: null,
    coachingMain: 'Timed exercise',
    coachingSub: `Log ${exerciseName} duration or reps — no weight progression for this movement.`,
    displayReason: 'Timed exercise — focus on quality holds or controlled reps.',
  }
}

export function getProgressionRecommendation(
  catalog: CatalogExercise,
  lastPerformance: LastExercisePerformance | null,
  targetSets: number,
  now: Date = new Date(),
): ProgressionRecommendation {
  if (catalog.coachingMode === 'time') {
    return buildTimeCoaching(catalog.name)
  }

  const repRange = getRepRangeForCatalog(catalog)
  if (!repRange) {
    return buildFirstSession(6, 10, targetSets)
  }

  const { floor: repFloor, ceiling: repCeiling } = repRange
  const isWeighted = catalog.coachingMode === 'weighted'
  const increment = catalog.weightIncrementLbs ?? 5

  if (!lastPerformance || lastPerformance.sets.length === 0) {
    return buildFirstSession(repFloor, repCeiling, targetSets)
  }

  const daysAgo = daysSince(lastPerformance.lastPerformedAt, now)
  const lastLines = lastPerformance.sets.map((set) =>
    formatSetLine(set.weight, set.reps),
  )

  const reps = lastPerformance.sets.map((set) => set.reps)
  const topNumericWeight =
    numericWeight(lastPerformance.topSet?.weight ?? lastPerformance.sets[0]?.weight ?? null) ?? 0

  if (isWeighted && daysAgo > STALE_DAYS && topNumericWeight > 0) {
    const resetWeight = roundDownToIncrement(topNumericWeight * 0.9, 5)
    return {
      case: 4,
      repFloor,
      repCeiling,
      targetSets,
      suggestedWeightLbs: resetWeight,
      previousWeightLbs: topNumericWeight,
      lastWorkoutLines: lastLines,
      daysSinceLastWorkout: daysAgo,
      coachingMain: `↓ Conservative reset · ${topNumericWeight} → ${resetWeight} lbs`,
      coachingSub: "It's been a while. Ease back in and rebuild momentum.",
      displayReason: `It's been ${daysAgo} days. Ease back in at ${resetWeight} lbs.`,
    }
  }

  const progressionCase = evaluateCase(reps, repCeiling)

  if (progressionCase === 1) {
    const newWeight = isWeighted ? topNumericWeight + increment : null
    const coachingMain = isWeighted
      ? `↑ Weight increased · ${topNumericWeight} → ${newWeight} lbs today`
      : `↑ Ready to progress · aim for more reps today`
    const coachingSub = isWeighted
      ? `Start at ${repFloor} reps and build across sets. Hit ${repCeiling} on set ${targetSets} and you progress again next session.`
      : `Build toward ${repCeiling} reps per set. Hit the ceiling on every set to progress next time.`

    return {
      case: 1,
      repFloor,
      repCeiling,
      targetSets,
      suggestedWeightLbs: newWeight,
      previousWeightLbs: isWeighted ? topNumericWeight : null,
      lastWorkoutLines: lastLines,
      daysSinceLastWorkout: daysAgo,
      coachingMain,
      coachingSub,
      displayReason:
        'You reached the top of your rep range. Increase weight and build back up from the lower end.',
    }
  }

  if (progressionCase === 3) {
    const holdWeight = isWeighted ? topNumericWeight : null
    return {
      case: 3,
      repFloor,
      repCeiling,
      targetSets,
      suggestedWeightLbs: holdWeight,
      previousWeightLbs: holdWeight,
      lastWorkoutLines: lastLines,
      daysSinceLastWorkout: daysAgo,
      coachingMain: isWeighted
        ? `→ Stay at ${holdWeight} lbs — focus on form`
        : '→ Stay at current reps — focus on form',
      coachingSub: 'Performance dropped last session. Quality reps matter more than numbers today.',
      displayReason: 'Performance dropped across sets. Stay here and focus on quality reps.',
    }
  }

  const holdWeight = isWeighted ? topNumericWeight : null
  return {
    case: 2,
    repFloor,
    repCeiling,
    targetSets,
    suggestedWeightLbs: holdWeight,
    previousWeightLbs: holdWeight,
    lastWorkoutLines: lastLines,
    daysSinceLastWorkout: daysAgo,
    coachingMain: isWeighted ? `→ Stay at ${holdWeight} lbs` : '→ Keep building reps',
    coachingSub: 'Keep building reps at this weight.',
    displayReason: 'Keep building reps at this weight.',
  }
}
