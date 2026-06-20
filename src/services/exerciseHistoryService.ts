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
