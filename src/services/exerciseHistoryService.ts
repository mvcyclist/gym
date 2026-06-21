/**
 * Phase 1 exercise history queries over loadLedger() — device-ledger scoped, not cloud reads.
 *
 * Freshness = last local merge + confirmed history writes. See MVP1_BACKEND_REQUIREMENTS.md.
 */
import { loadLedger } from './ledgerRepository'
import {
  assertValidHistoryExerciseKey,
  exerciseLogMatchesHistoryKey,
  HISTORY_KEY_KIND,
  resolveHistoryExerciseName,
} from './exerciseIdentity'
import { filterProgressionSessions } from './historyQueryPolicy'
import type { ExerciseLog, SetLog, WorkoutSession } from '../types/workout'
import { getSessionCalendarDate } from '../utils/sessionMetrics'
import {
  computeTotalVolume,
  findTopSet,
  parseSetLoad,
  sumReps,
  type ParsedWeight,
} from '../utils/setParsing'
import {
  countQualifyingSets,
  type ExerciseHistory as EngineExerciseHistory,
} from './progressiveOverloadEngine'

export interface LastExercisePerformanceSet {
  setNumber: number
  weight: ParsedWeight
  reps: number
}

export interface LastExercisePerformance {
  historyExerciseKey: string
  keyKind: typeof HISTORY_KEY_KIND
  exerciseName: string
  lastPerformedAt: string
  sets: LastExercisePerformanceSet[]
  totalReps: number
  topSet: { weight: ParsedWeight; reps: number } | null
  totalVolume: number | null
}

function completedSetsFromLog(log: ExerciseLog): LastExercisePerformanceSet[] {
  return log.sets
    .filter((set) => set.completed)
    .map((set) => parsedPerformanceSet(set))
    .filter((set): set is LastExercisePerformanceSet => set !== null)
    .sort((a, b) => a.setNumber - b.setNumber)
}

function parsedPerformanceSet(set: SetLog): LastExercisePerformanceSet | null {
  const { weight, reps } = parseSetLoad(set)
  if (weight === null || reps === null) return null
  return { setNumber: set.setNumber, weight, reps }
}

function sortSessionsByRecency(sessions: WorkoutSession[]): WorkoutSession[] {
  return [...sessions].sort((a, b) => {
    const aTime = a.completedAt ?? a.updatedAt
    const bTime = b.completedAt ?? b.updatedAt
    return bTime.localeCompare(aTime)
  })
}

export function getRecentCompletedSessions(limit?: number): WorkoutSession[] {
  const ledger = loadLedger()
  const sorted = sortSessionsByRecency(filterProgressionSessions(ledger.sessions))
  return limit === undefined ? sorted : sorted.slice(0, limit)
}

export function getLastCompletedSessionByWorkoutType(
  workoutType: WorkoutSession['workoutType'],
): WorkoutSession | null {
  return (
    getRecentCompletedSessions().find((session) => session.workoutType === workoutType) ?? null
  )
}

export function getExerciseSetsFromSession(
  sessionId: string,
  historyExerciseKey: string,
): LastExercisePerformanceSet[] {
  assertValidHistoryExerciseKey(historyExerciseKey)

  const session = loadLedger().sessions.find((item) => item.id === sessionId)
  if (!session) return []

  const log = session.exercises.find((item) => exerciseLogMatchesHistoryKey(item, historyExerciseKey))
  if (!log) return []

  return completedSetsFromLog(log)
}

export function getLastExercisePerformance(
  historyExerciseKey: string,
): LastExercisePerformance | null {
  assertValidHistoryExerciseKey(historyExerciseKey)

  const sessions = sortSessionsByRecency(filterProgressionSessions(loadLedger().sessions))

  for (const session of sessions) {
    const log = session.exercises.find((item) =>
      exerciseLogMatchesHistoryKey(item, historyExerciseKey),
    )
    if (!log) continue

    const sets = completedSetsFromLog(log)
    if (sets.length === 0) continue

    const numericSets = sets.map((set) => ({ weight: set.weight, reps: set.reps }))
    const top = findTopSet(numericSets)

    return {
      historyExerciseKey,
      keyKind: HISTORY_KEY_KIND,
      exerciseName: resolveHistoryExerciseName(historyExerciseKey, log),
      lastPerformedAt: getSessionCalendarDate(session),
      sets,
      totalReps: sumReps(sets),
      topSet: top,
      totalVolume: computeTotalVolume(numericSets),
    }
  }

  return null
}

/**
 * Returns all completed sessions for an exercise in the shape the progression
 * engine expects. This is the single read path for progression — no parallel store.
 */
export function getExerciseHistoryForProgression(
  historyExerciseKey: string,
  repRangeBottom: number,
  repRangeTop: number,
): EngineExerciseHistory[] {
  assertValidHistoryExerciseKey(historyExerciseKey)

  const sessions = filterProgressionSessions(loadLedger().sessions)
  const result: EngineExerciseHistory[] = []

  for (const session of sessions) {
    const log = session.exercises.find((item) =>
      exerciseLogMatchesHistoryKey(item, historyExerciseKey),
    )
    if (!log) continue

    const engineSets = log.sets
      .filter((s) => s.completed)
      .map((s) => {
        const { weight, reps } = parseSetLoad(s)
        if (weight === null || weight === 'BW' || reps === null) return null
        return { reps, weightLbs: weight as number, completed: true as const }
      })
      .filter((s): s is { reps: number; weightLbs: number; completed: true } => s !== null)

    if (engineSets.length === 0) continue

    const topWeight = Math.max(...engineSets.map((s) => s.weightLbs))
    const timestamp = new Date(session.completedAt ?? session.updatedAt).getTime()
    const date = (session.completedAt ?? session.updatedAt).slice(0, 10)

    result.push({
      exerciseName: historyExerciseKey,
      date,
      timestamp,
      weight: topWeight,
      sets: engineSets,
      repRangeBottom,
      repRangeTop,
      qualifyingSets: countQualifyingSets(engineSets, repRangeBottom),
    })
  }

  return result
}
