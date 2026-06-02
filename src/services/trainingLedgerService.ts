import { loadLedger, saveLedger } from '../adapters/localLedgerStorage'
import type { ActivityEntry, DayActivity } from '../types/training'
import type { WorkoutSession } from '../types/workout'
import { buildLastSevenDays, createActivityEntry } from '../utils/activityHistory'
import { getSessionCalendarDate } from '../utils/sessionMetrics'
import { sessionToActivityEntry } from '../utils/sessionToActivity'

// Phase 2: swap LocalLedgerStorage for SupabaseAdapter + sync queue.

function buildActivitiesByDate(): Record<string, ActivityEntry[]> {
  const ledger = loadLedger()
  const byDate: Record<string, ActivityEntry[]> = {}

  const addEntry = (entry: ActivityEntry) => {
    if (!byDate[entry.date]) byDate[entry.date] = []
    byDate[entry.date].push(entry)
  }

  ledger.sessions
    .filter((session) => session.status === 'completed' || session.status === 'partial')
    .forEach((session) => {
      addEntry(sessionToActivityEntry(session))
    })

  Object.entries(ledger.manualByDate).forEach(([date, entries]) => {
    entries.forEach((entry) => {
      addEntry({
        ...entry,
        date,
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
  const ledger = loadLedger()

  days.forEach(({ date, activities }) => {
    if (activities.length === 0) return
    ledger.manualByDate[date] = activities.map((activity) =>
      createActivityEntry(date, activity.type, {
        intensity: activity.intensity ?? 'Moderate',
        source: 'manual',
      }),
    )
  })

  saveLedger(ledger)
}

export function getManualActivitiesForDate(date: string): ActivityEntry[] {
  const ledger = loadLedger()
  return (ledger.manualByDate[date] ?? []).map((entry) => ({
    ...entry,
    date,
    source: 'manual' as const,
  }))
}

export function upsertSession(session: WorkoutSession): void {
  const ledger = loadLedger()
  const index = ledger.sessions.findIndex((item) => item.id === session.id)

  if (index >= 0) {
    ledger.sessions[index] = session
  } else {
    ledger.sessions.unshift(session)
  }

  saveLedger(ledger)
}

export function removeSession(sessionId: string): void {
  const ledger = loadLedger()
  ledger.sessions = ledger.sessions.filter((session) => session.id !== sessionId)
  saveLedger(ledger)
}

export function recordCompletedWorkout(session: WorkoutSession): void {
  const completed: WorkoutSession = {
    ...session,
    status: 'completed',
    completedAt: session.completedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  upsertSession(completed)
}

export function recordPartialWorkout(session: WorkoutSession): void {
  const partial: WorkoutSession = {
    ...session,
    status: 'partial',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  upsertSession(partial)
}

export function updateManualActivities(date: string, activities: ActivityEntry[]): void {
  const ledger = loadLedger()
  ledger.manualByDate[date] = activities.map((activity) =>
    createActivityEntry(date, activity.type, {
      intensity: activity.intensity,
      durationMinutes: activity.durationMinutes,
      notes: activity.notes,
      source: 'manual',
    }),
  )
  saveLedger(ledger)
}

export function getSessionById(sessionId: string): WorkoutSession | undefined {
  return loadLedger().sessions.find((session) => session.id === sessionId)
}

export function getSessionsForDate(date: string): WorkoutSession[] {
  return loadLedger().sessions.filter(
    (session) =>
      (session.status === 'completed' || session.status === 'partial') &&
      getSessionCalendarDate(session) === date,
  )
}
