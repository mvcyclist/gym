/**
 * Session coaching — single source of truth for all in-session coaching logic.
 *
 * Covers:
 *   - Pre-exercise recommendation (weight, rep targets, coaching copy)
 *   - Between-set feedback after each completed set
 *   - Next session card shown after the last set completes
 *
 * To experiment with a new coaching philosophy, edit this file only.
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
  weightIncrement: number
}

export interface SetFeedback {
  tone: 'amber' | 'green'
  message: string
}

export interface NextSessionCard {
  title: string
  body: string
  suggestedWeightLbs: number | null
  repFloor: number
  repCeiling: number
}

// ─── Between-set feedback ────────────────────────────────────────────────────

/**
 * Returns feedback for the set that was just completed.
 *
 * @param justCompletedSetNumber  1-indexed set number just finished
 * @param allCompletedReps        reps for sets 1..N in order (length = justCompletedSetNumber)
 * @param repFloor                minimum acceptable reps at this weight
 * @param repCeiling              rep target indicating readiness to progress
 * @param totalSets               total number of sets in this exercise
 */
export function getSetFeedback(
  justCompletedSetNumber: number,
  allCompletedReps: number[],
  repFloor: number,
  repCeiling: number,
  totalSets: number,
): SetFeedback | null {
  const repsLogged = allCompletedReps[justCompletedSetNumber - 1]
  if (repsLogged === undefined || repsLogged === 0) return null

  const isLastSet = justCompletedSetNumber === totalSets

  if (isLastSet) {
    const repsStr = allCompletedReps.slice(0, totalSets).join(' / ')
    const firstReps = allCompletedReps[0] ?? 0
    const hasSignificantDrop = allCompletedReps
      .slice(0, totalSets)
      .some((r) => firstReps > 0 && r < firstReps * 0.75)
    const allNearCeiling = allCompletedReps
      .slice(0, totalSets)
      .every((r) => r >= repCeiling - 1)

    if (allNearCeiling) {
      return { tone: 'green', message: `${repsStr} — strong session. You're ready to progress.` }
    }
    if (hasSignificantDrop) {
      return {
        tone: 'amber',
        message: `${repsStr} — performance dropped. Focus on form next time.`,
      }
    }
    return { tone: 'green', message: `${repsStr} — solid. Keep building at this weight.` }
  }

  if (justCompletedSetNumber === 1) {
    if (repsLogged >= repCeiling) {
      return {
        tone: 'green',
        message: 'Hit the ceiling on set 1 — push for it on the next set too.',
      }
    }
    if (repsLogged < repFloor) {
      return {
        tone: 'amber',
        message: `${repsLogged} reps — below target. Drop weight if it happens again.`,
      }
    }
    return null
  }

  if (justCompletedSetNumber === 2) {
    const set1Reps = allCompletedReps[0] ?? 0
    if (repsLogged < repFloor) {
      return {
        tone: 'amber',
        message: `${repsLogged} reps — below target. Drop weight if it happens again.`,
      }
    }
    if (set1Reps > 0 && repsLogged < set1Reps * 0.75) {
      return {
        tone: 'amber',
        message: `Rep drop from set 1 (${set1Reps} → ${repsLogged}). Consider dropping weight.`,
      }
    }
    return null
  }

  return null
}

// ─── Next session card ───────────────────────────────────────────────────────

export function getNextSessionCard(rec: ProgressionRecommendation): NextSessionCard | null {
  if (rec.case === 5) return null

  const { repFloor, repCeiling, suggestedWeightLbs, daysSinceLastWorkout } = rec

  switch (rec.case) {
    case 1:
      return {
        title: `↑ Increase to ${suggestedWeightLbs} lbs`,
        body: `You hit ${repCeiling} reps across all sets. Add weight and build back from the lower end.`,
        suggestedWeightLbs,
        repFloor,
        repCeiling,
      }
    case 2:
      return {
        title: `→ Stay at ${suggestedWeightLbs} lbs`,
        body: 'Keep building reps. Hit the ceiling consistently before adding weight.',
        suggestedWeightLbs,
        repFloor,
        repCeiling,
      }
    case 3:
      return {
        title: `→ Stay at ${suggestedWeightLbs} lbs`,
        body: 'Performance dropped across sets. Same weight, focus on quality next session.',
        suggestedWeightLbs,
        repFloor,
        repCeiling,
      }
    case 4:
      return {
        title: `↓ Reset to ${suggestedWeightLbs} lbs`,
        body: `It's been ${daysSinceLastWorkout} days. Ease back in and rebuild momentum.`,
        suggestedWeightLbs,
        repFloor,
        repCeiling,
      }
    default:
      return null
  }
}

// ─── Post-session next-session card ──────────────────────────────────────────

/**
 * Computes the next session card from what was ACTUALLY logged this session,
 * rather than from the pre-session recommendation.
 */
export function getPostSessionNextCard(
  completedSets: Array<{ weight: number | 'BW' | null; reps: number }>,
  repFloor: number,
  repCeiling: number,
  increment: number,
): NextSessionCard | null {
  const numericSets = completedSets.filter(
    (s): s is { weight: number; reps: number } =>
      typeof s.weight === 'number' && s.reps > 0,
  )

  if (numericSets.length === 0) return null

  const topWeight = Math.max(...numericSets.map((s) => s.weight))
  const reps = numericSets.map((s) => s.reps)
  const progressionCase = evaluateCase(reps, repCeiling)

  if (progressionCase === 1) {
    const newWeight = roundToIncrement(topWeight + increment, increment)
    return {
      title: `↑ Increase to ${newWeight} lbs`,
      body: `You hit ${repCeiling} reps across all sets. Add weight and build back from the lower end.`,
      suggestedWeightLbs: newWeight,
      repFloor,
      repCeiling,
    }
  }

  if (progressionCase === 3) {
    return {
      title: `→ Stay at ${topWeight} lbs`,
      body: 'Performance dropped across sets. Same weight, focus on quality next session.',
      suggestedWeightLbs: topWeight,
      repFloor,
      repCeiling,
    }
  }

  return {
    title: `→ Stay at ${topWeight} lbs`,
    body: 'Keep building reps at this weight.',
    suggestedWeightLbs: topWeight,
    repFloor,
    repCeiling,
  }
}

// ─── Pre-exercise recommendation ─────────────────────────────────────────────

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

function roundToIncrement(weight: number, increment: number): number {
  if (increment <= 0) return weight
  return Math.round(weight / increment) * increment
}

function numericWeight(weight: number | 'BW'): number | null {
  return typeof weight === 'number' ? weight : null
}

function evaluateCase(reps: number[], repCeiling: number): 1 | 2 | 3 {
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
  increment: number,
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
    weightIncrement: increment,
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
    weightIncrement: 0,
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
  const increment = catalog.weightIncrementLbs ?? 5

  if (!repRange) {
    return buildFirstSession(6, 10, targetSets, increment)
  }

  const { floor: repFloor, ceiling: repCeiling } = repRange
  const isWeighted = catalog.coachingMode === 'weighted'

  if (!lastPerformance || lastPerformance.sets.length === 0) {
    return buildFirstSession(repFloor, repCeiling, targetSets, increment)
  }

  const daysAgo = daysSince(lastPerformance.lastPerformedAt, now)
  const lastLines = lastPerformance.sets.map((set) =>
    formatSetLine(set.weight, set.reps),
  )

  const reps = lastPerformance.sets.map((set) => set.reps)
  const topNumericWeight =
    numericWeight(lastPerformance.topSet?.weight ?? lastPerformance.sets[0]?.weight ?? null) ?? 0

  if (isWeighted && daysAgo > STALE_DAYS && topNumericWeight > 0) {
    const resetWeight = roundToIncrement(topNumericWeight * 0.9, 5)
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
      weightIncrement: increment,
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
      weightIncrement: increment,
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
      weightIncrement: increment,
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
    weightIncrement: increment,
  }
}
