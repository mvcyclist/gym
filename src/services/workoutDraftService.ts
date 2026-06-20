import { clearDraft, loadDraft } from '../adapters/workoutDraftStorage'
import { recordPartialWorkout } from './trainingLedgerService'
import { isDraftableSessionStatus } from '../types/draft'
import type { WorkoutSession } from '../types/workout'
import { toDateString } from '../utils/activityHistory'
import { getWorkoutElapsedMs } from '../utils/workoutTimer'

function isSessionFromToday(session: WorkoutSession): boolean {
  return toDateString(new Date(session.startedAt)) === toDateString(new Date())
}

export function findPriorDayDraft(): WorkoutSession | undefined {
  const draft = loadDraft()
  if (!draft || !isDraftableSessionStatus(draft.status)) return undefined
  if (isSessionFromToday(draft)) return undefined
  return draft
}

export async function promoteDraftToPartial(
  source: WorkoutSession,
  options?: { calendarDate?: string },
): Promise<WorkoutSession> {
  const completedAt = options?.calendarDate
    ? endOfLocalDayIso(options.calendarDate)
    : new Date().toISOString()

  const partial: WorkoutSession = {
    ...source,
    status: 'partial',
    completedAt,
    updatedAt: new Date().toISOString(),
    workoutElapsedMs: getWorkoutElapsedMs(source),
    workoutTimerStartedAt: null,
  }

  await recordPartialWorkout(partial)
  clearDraft()
  return partial
}

function endOfLocalDayIso(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const end = new Date(year, month - 1, day, 23, 59, 0, 0)
  return end.toISOString()
}

export function discardDraft(): void {
  clearDraft()
}

export function formatDraftWorkoutDate(session: WorkoutSession): string {
  return new Date(session.startedAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
