/**
 * Single front door for history reads — calendar, sessions, and exercise performance.
 *
 * Results are device-ledger scoped until authoritative cloud reads (Phase 6).
 * See exerciseHistoryService.ts and MVP1_BACKEND_REQUIREMENTS.md.
 */
import { loadLedger } from './ledgerRepository'
import { filterCalendarSessions, isHistorySession } from './historyQueryPolicy'
import type { ActivityEntry, DayActivity } from '../types/training'
import type { WorkoutSession } from '../types/workout'
import {
  buildLastSevenDays,
  resolveManualStorageKey,
} from '../utils/activityHistory'
import { getSessionCalendarDate } from '../utils/sessionMetrics'
import { sessionToActivityEntry } from '../utils/sessionToActivity'

export {
  getExerciseHistoryForProgression,
  getExerciseSetsFromSession,
  getLastCompletedSessionByWorkoutType,
  getLastExercisePerformance,
  getRecentCompletedSessions,
} from './exerciseHistoryService'
export type {
  LastExercisePerformance,
  LastExercisePerformanceSet,
} from './exerciseHistoryService'

function buildActivitiesByDate(): Record<string, ActivityEntry[]> {
  const ledger = loadLedger()
  const byDate: Record<string, ActivityEntry[]> = {}

  const addEntry = (entry: ActivityEntry) => {
    if (!byDate[entry.date]) byDate[entry.date] = []
    byDate[entry.date].push(entry)
  }

  filterCalendarSessions(ledger.sessions).forEach((session) => {
    addEntry(sessionToActivityEntry(session))
  })

  Object.entries(ledger.manualByDate).forEach(([storedKey, entries]) => {
    const dateKey =
      ledger.version >= 3 ? storedKey : resolveManualStorageKey(storedKey)

    entries.forEach((entry) => {
      addEntry({
        ...entry,
        date: dateKey,
        source: 'manual',
      })
    })
  })

  return byDate
}

export function getLastSevenDays(): DayActivity[] {
  return buildLastSevenDays(buildActivitiesByDate())
}

export function getManualActivitiesForDate(date: string): ActivityEntry[] {
  const ledger = loadLedger()
  return (ledger.manualByDate[date] ?? []).map((entry) => ({
    ...entry,
    date,
    source: 'manual' as const,
  }))
}

export function getSessionById(sessionId: string): WorkoutSession | undefined {
  return loadLedger().sessions.find(
    (session) => session.id === sessionId && isHistorySession(session),
  )
}

export function getSessionsForDate(date: string): WorkoutSession[] {
  return filterCalendarSessions(loadLedger().sessions).filter(
    (session) => getSessionCalendarDate(session) === date,
  )
}
