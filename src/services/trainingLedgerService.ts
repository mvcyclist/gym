/**
 * History writes and manual-activity mutations.
 *
 * For reads, use historyQueryService — the single front door for ledger queries.
 */
import {
  getPlanOverrides,
  removeSession as removeSessionFromLedger,
  replaceManualActivities,
  replacePlanOverride,
  upsertSession,
} from './ledgerRepository'
import { getManualActivitiesForDate, getSessionsForDate } from './historyQueryService'
import type { ActivityEntry, ActivityType } from '../types/training'
import type { WorkoutSession } from '../types/workout'
import { createActivityEntry } from '../utils/activityHistory'
import { workoutCategoryToActivityType } from '../utils/workoutCategoryMap'

export {
  getLastSevenDays,
  getManualActivitiesForDate,
  getSessionById,
  getSessionsForDate,
} from './historyQueryService'

export { getPlanOverrides, upsertSession }

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

/**
 * Replace everything logged for a calendar day with manual entries for the selected types.
 * Clears workout sessions for that date so edits match what the user sees.
 */
export function replaceDayLog(date: string, types: ActivityType[]): void {
  const uniqueTypes = [...new Set(types)]

  for (const session of getSessionsForDate(date)) {
    removeSessionFromLedger(session.id)
  }

  if (uniqueTypes.length === 0) {
    replaceManualActivities(date, [])
    return
  }

  replaceManualActivities(
    date,
    uniqueTypes.map((type) =>
      createActivityEntry(date, type, {
        intensity: 'Moderate',
        durationMinutes: 45,
        source: 'manual',
      }),
    ),
  )
}

export function updatePlanOverride(date: string, activityTypes: ActivityType[]): void {
  replacePlanOverride(date, activityTypes)
}

export function appendManualActivity(date: string, entry: ActivityEntry): void {
  for (const session of getSessionsForDate(date)) {
    const sessionType = workoutCategoryToActivityType(session.workoutType)
    if (sessionType === entry.type) {
      removeSessionFromLedger(session.id)
    }
  }

  const withoutSameType = getManualActivitiesForDate(date).filter(
    (existing) => existing.type !== entry.type,
  )
  replaceManualActivities(date, [...withoutSameType, entry])
}
