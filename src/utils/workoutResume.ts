import { loadLedger } from '../services/ledgerRepository'
import type { WorkoutSession } from '../types/workout'
import { toDateString } from './activityHistory'

function isSessionFromToday(session: WorkoutSession): boolean {
  return toDateString(new Date(session.startedAt)) === toDateString(new Date())
}

export function findTodaysActiveSession(): WorkoutSession | undefined {
  return loadLedger().sessions.find(
    (session) => session.status === 'active' && isSessionFromToday(session),
  )
}

export function findResumeExerciseIndex(session: WorkoutSession): number {
  const firstIncomplete = session.exercises.findIndex((exercise) =>
    exercise.sets.some((set) => !set.completed),
  )
  if (firstIncomplete >= 0) return firstIncomplete
  return Math.max(0, session.exercises.length - 1)
}
