import type { ActivityEntry } from './training'
import type { WorkoutSession } from './workout'

export interface TrainingLedger {
  version: 1
  sessions: WorkoutSession[]
  manualByDate: Record<string, ActivityEntry[]>
}
