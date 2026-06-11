import { loadLedger } from '../services/ledgerRepository'
import type { WorkoutSession } from '../types/workout'
import { toDateString } from './activityHistory'

function isSessionFromToday(session: WorkoutSession): boolean {
  return toDateString(new Date(session.startedAt)) === toDateString(new Date())
}

export function findTodaysResumableSession(): WorkoutSession | undefined {
  return loadLedger().sessions.find(
    (session) =>
      (session.status === 'active' || session.status === 'paused') && isSessionFromToday(session),
  )
}

/** @deprecated Use findTodaysResumableSession */
export function findTodaysActiveSession(): WorkoutSession | undefined {
  return findTodaysResumableSession()
}

export function findResumeExerciseIndex(
  session: WorkoutSession,
  templateExerciseIds: string[],
): number {
  const loggedIds = new Set(session.exercises.map((exercise) => exercise.exerciseId))

  for (let index = 0; index < templateExerciseIds.length; index += 1) {
    const exerciseId = templateExerciseIds[index]
    if (!loggedIds.has(exerciseId)) continue

    const exerciseLog = session.exercises.find((log) => log.exerciseId === exerciseId)
    if (exerciseLog?.sets.some((set) => !set.completed)) return index
  }

  return Math.max(0, templateExerciseIds.length - 1)
}
