import type { ActivityEntry, ActivityType } from './training'
import type { WorkoutSession } from './workout'

export interface TrainingLedger {
  version: 1 | 2 | 3 | 4
  sessions: WorkoutSession[]
  manualByDate: Record<string, ActivityEntry[]>
  /** User-chosen future plan overrides; synced to cloud when signed in. */
  planOverridesByDate?: Record<string, ActivityType[]>
}
