import {
  loadLedger,
  removeSession as removeSessionFromLedger,
  replaceManualActivities,
  upsertSession,
} from './ledgerRepository'
import { filterCalendarSessions, isHistorySession } from './historyQueryPolicy'
import type { ActivityEntry, DayActivity } from '../types/training'
import type { WorkoutSession } from '../types/workout'
import {
  buildLastSevenDays,
  createActivityEntry,
  resolveManualStorageKey,
} from '../utils/activityHistory'
import { getSessionCalendarDate } from '../utils/sessionMetrics'
import { sessionToActivityEntry } from '../utils/sessionToActivity'

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

export function saveBackfillDays(
  days: Array<{
    date: string
    activities: Array<{ type: ActivityEntry['type']; intensity?: ActivityEntry['intensity'] }>
  }>,
): void {
  days.forEach(({ date, activities }) => {
    if (activities.length === 0) return
    replaceManualActivities(
      date,
      activities.map((activity) =>
        createActivityEntry(date, activity.type, {
          intensity: activity.intensity ?? 'Moderate',
          source: 'manual',
        }),
      ),
    )
  })
}

export function getManualActivitiesForDate(date: string): ActivityEntry[] {
  const ledger = loadLedger()
  return (ledger.manualByDate[date] ?? []).map((entry) => ({
    ...entry,
    date,
    source: 'manual' as const,
  }))
}

export { upsertSession }

export function removeSession(sessionId: string): void {
  removeSessionFromLedger(sessionId)
}

export async function recordCompletedWorkout(session: WorkoutSession): Promise<void> {
  const completed: WorkoutSession = {
    ...session,
    status: 'completed',
    completedAt: session.completedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await upsertSession(completed)
}

export async function recordPartialWorkout(session: WorkoutSession): Promise<void> {
  const partial: WorkoutSession = {
    ...session,
    status: 'partial',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await upsertSession(partial)
}

export function updateManualActivities(date: string, activities: ActivityEntry[]): void {
  replaceManualActivities(
    date,
    activities.map((activity) =>
      createActivityEntry(date, activity.type, {
        intensity: activity.intensity,
        durationMinutes: activity.durationMinutes,
        notes: activity.notes,
        source: 'manual',
      }),
    ),
  )
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
