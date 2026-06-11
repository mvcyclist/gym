import type { WorkoutSession } from '../types/workout'

export function getWorkoutElapsedMs(session: WorkoutSession, now = Date.now()): number {
  const base = session.workoutElapsedMs ?? 0
  if (session.status === 'active' && session.workoutTimerStartedAt) {
    return base + (now - new Date(session.workoutTimerStartedAt).getTime())
  }
  return base
}

export function getWorkoutElapsedSeconds(session: WorkoutSession, now = Date.now()): number {
  return Math.floor(getWorkoutElapsedMs(session, now) / 1000)
}

export function isWorkoutInProgress(session: WorkoutSession | null | undefined): boolean {
  return session?.status === 'active' || session?.status === 'paused'
}
