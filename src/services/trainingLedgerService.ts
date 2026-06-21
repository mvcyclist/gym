/**
 * History writes and manual-activity mutations.
 *
 * For reads, use historyQueryService — the single front door for ledger queries.
 */
import {
  removeSession as removeSessionFromLedger,
  replaceManualActivities,
  upsertSession,
} from './ledgerRepository'
import { getManualActivitiesForDate } from './historyQueryService'
import type { ActivityEntry } from '../types/training'
import type { WorkoutSession } from '../types/workout'
import { createActivityEntry } from '../utils/activityHistory'

export {
  getLastSevenDays,
  getManualActivitiesForDate,
  getSessionById,
  getSessionsForDate,
} from './historyQueryService'

export { upsertSession }

export function removeSession(sessionId: string): void {
  removeSessionFromLedger(sessionId)
}

/** Remove a confirmed history session from ledger and cloud. */
export function deleteCompletedSession(sessionId: string): void {
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

export function appendManualActivity(date: string, entry: ActivityEntry): void {
  const existing = getManualActivitiesForDate(date)
  replaceManualActivities(date, [...existing, entry])
}
