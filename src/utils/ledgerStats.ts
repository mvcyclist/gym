import type { TrainingLedger } from '../types/ledger'

export function countSyncedSessions(ledger: TrainingLedger): number {
  return ledger.sessions.filter(
    (session) => session.status === 'completed' || session.status === 'partial',
  ).length
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
