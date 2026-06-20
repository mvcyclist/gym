import { loadDraft, saveDraft } from '../adapters/workoutDraftStorage'
import { isDraftableSessionStatus } from '../types/draft'
import type { TrainingLedger } from '../types/ledger'
import type { WorkoutSession } from '../types/workout'
import { toDateString } from '../utils/activityHistory'

function isSessionFromToday(session: WorkoutSession): boolean {
  return toDateString(new Date(session.startedAt)) === toDateString(new Date())
}

/**
 * Move today's in-progress ledger rows into draft storage; strip all active/paused from history.
 */
export function migrateLedgerInProgressToDraft(ledger: TrainingLedger): {
  ledger: TrainingLedger
  removedInProgressIds: string[]
} {
  const inProgress = ledger.sessions.filter((session) => isDraftableSessionStatus(session.status))
  if (inProgress.length === 0) {
    return { ledger, removedInProgressIds: [] }
  }

  const todaysInProgress = inProgress
    .filter(isSessionFromToday)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const ledgerCandidate = todaysInProgress[0] ?? null
  const existingDraft = loadDraft()

  if (ledgerCandidate) {
    const shouldUseLedger =
      !existingDraft || ledgerCandidate.updatedAt.localeCompare(existingDraft.updatedAt) > 0

    if (shouldUseLedger) {
      saveDraft(ledgerCandidate)
    }
  }

  const removedInProgressIds = inProgress.map((session) => session.id)
  const historySessions = ledger.sessions.filter(
    (session) => !isDraftableSessionStatus(session.status),
  )

  return {
    ledger: { ...ledger, sessions: historySessions },
    removedInProgressIds,
  }
}
