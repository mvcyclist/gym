import type { TrainingLedger } from '../types/ledger'
import type { WorkoutSession } from '../types/workout'
import type { ActivityEntry, ActivityType } from '../types/training'
import { filterCalendarSessions } from '../services/historyQueryPolicy'

/** Merge rules documented in services/ledgerMergePolicy.ts */

export function countSyncedSessions(ledger: TrainingLedger): number {
  return filterCalendarSessions(ledger.sessions).length
}

export function countManualActivities(ledger: TrainingLedger): number {
  return Object.values(ledger.manualByDate).reduce((total, entries) => total + entries.length, 0)
}

export function ledgerActivityScore(ledger: TrainingLedger): number {
  return countSyncedSessions(ledger) * 10 + countManualActivities(ledger)
}

export function hasMeaningfulLedger(ledger: TrainingLedger): boolean {
  return ledgerActivityScore(ledger) > 0
}

export function shouldPreferLocalLedger(local: TrainingLedger, cloud: TrainingLedger): boolean {
  const localScore = ledgerActivityScore(local)
  const cloudScore = ledgerActivityScore(cloud)
  if (localScore === 0) return false
  if (cloudScore === 0) return true
  return localScore > cloudScore
}

export function mergeLedgers(local: TrainingLedger, cloud: TrainingLedger): TrainingLedger {
  const sessionsById = new Map<string, WorkoutSession>()

  for (const session of [...local.sessions, ...cloud.sessions]) {
    const existing = sessionsById.get(session.id)
    if (!existing || session.updatedAt.localeCompare(existing.updatedAt) > 0) {
      sessionsById.set(session.id, session)
    }
  }

  const sessions = [...sessionsById.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )

  const manualByDate: Record<string, ActivityEntry[]> = {}

  for (const [date, entries] of Object.entries(cloud.manualByDate)) {
    manualByDate[date] = [...entries]
  }

  for (const [date, entries] of Object.entries(local.manualByDate)) {
    const merged = new Map((manualByDate[date] ?? []).map((entry) => [entry.id, entry]))
    for (const entry of entries) {
      merged.set(entry.id, entry)
    }
    manualByDate[date] = [...merged.values()]
  }

  const planOverridesByDate: Record<string, ActivityType[]> = {
    ...(cloud.planOverridesByDate ?? {}),
  }
  for (const [date, types] of Object.entries(local.planOverridesByDate ?? {})) {
    planOverridesByDate[date] = types
  }

  return { version: 4, sessions, manualByDate, planOverridesByDate }
}
