import type { Intensity } from '../types/training'
import type { ExerciseLog, WorkoutSession } from '../types/workout'
import { toDateString } from './activityHistory'

export function canAdvanceFromExercise(log: ExerciseLog | undefined): boolean {
  if (!log) return false
  if (log.skipped) return true
  return log.sets.length > 0 && log.sets.every((set) => set.completed)
}

export function countCompletedSets(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
    0,
  )
}

export function countTotalSets(session: WorkoutSession): number {
  return session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

export function countExercisesWithCompletedSets(session: WorkoutSession): number {
  return session.exercises.filter((exercise) =>
    exercise.sets.some((set) => set.completed),
  ).length
}

/** Calendar day the workout belongs to — uses start day for completed/partial sessions. */
export function getSessionCalendarDate(session: WorkoutSession): string {
  const timestamp =
    session.status === 'completed' || session.status === 'partial'
      ? session.startedAt
      : session.completedAt ?? session.updatedAt ?? session.startedAt
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  return toDateString(date)
}

export function deriveSessionIntensity(session: WorkoutSession): Intensity {
  const completed = countCompletedSets(session)
  const total = countTotalSets(session)
  if (total === 0 || completed === 0) return 'Easy'

  const ratio = completed / total

  if (session.status === 'partial') {
    if (ratio < 0.4) return 'Easy'
    if (ratio < 0.7) return 'Moderate'
    return 'Moderate'
  }

  if (ratio >= 0.85) return 'Moderate'
  return 'Easy'
}

export function getSessionDurationMinutes(session: WorkoutSession): number | undefined {
  const end = session.completedAt ?? session.updatedAt
  const start = new Date(session.startedAt).getTime()
  const finish = new Date(end).getTime()
  const minutes = Math.round((finish - start) / 60000)
  return minutes > 0 ? minutes : undefined
}
