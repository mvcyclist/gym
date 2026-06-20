import type { WorkoutSession } from '../types/workout'

export type HistorySessionStatus = 'completed' | 'partial'

const CALENDAR_STATUSES = new Set<WorkoutSession['status']>(['completed', 'partial'])
const PROGRESSION_STATUSES = new Set<WorkoutSession['status']>(['completed'])

export function isCalendarSessionStatus(status: WorkoutSession['status']): boolean {
  return CALENDAR_STATUSES.has(status)
}

export function isProgressionSessionStatus(status: WorkoutSession['status']): boolean {
  return PROGRESSION_STATUSES.has(status)
}

export function isHistorySession(session: WorkoutSession): boolean {
  return isCalendarSessionStatus(session.status)
}

export function isProgressionSession(session: WorkoutSession): boolean {
  return isProgressionSessionStatus(session.status)
}

export function filterCalendarSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter(isHistorySession)
}

export function filterProgressionSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter(isProgressionSession)
}
