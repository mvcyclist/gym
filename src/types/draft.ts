import type { WorkoutSession } from './workout'

/** Persisted envelope for an in-progress workout (not in history ledger). */
export interface WorkoutDraft {
  version: number
  session: WorkoutSession
  savedAt: string
}

export const WORKOUT_DRAFT_VERSION = 1

export type DraftableSessionStatus = 'active' | 'paused'

export function isDraftableSessionStatus(
  status: WorkoutSession['status'],
): status is DraftableSessionStatus {
  return status === 'active' || status === 'paused'
}
