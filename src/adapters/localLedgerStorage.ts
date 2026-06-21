import type { TrainingLedger } from '../types/ledger'
import type { WorkoutSession } from '../types/workout'
import { migrateManualDateKeysFromUtcStorageKeys } from '../utils/activityHistory'
import { isHistorySession } from '../services/historyQueryPolicy'

const LEDGER_KEY_BASE = 'workout-deck-ledger'
const LEGACY_SESSIONS_KEY = 'workout-deck-sessions'

let boundUserId: string | null = null

function getLedgerKey(): string {
  return boundUserId ? `${LEDGER_KEY_BASE}:${boundUserId}` : LEDGER_KEY_BASE
}

export function bindLocalLedgerUser(userId: string | null): void {
  if (userId && userId !== boundUserId) {
    migrateLegacyGlobalLedger(userId)
  }
  boundUserId = userId
}

function migrateLegacyGlobalLedger(userId: string): void {
  const globalRaw = localStorage.getItem(LEDGER_KEY_BASE)
  if (!globalRaw) return
  const userKey = `${LEDGER_KEY_BASE}:${userId}`
  if (!localStorage.getItem(userKey)) {
    localStorage.setItem(userKey, globalRaw)
  }
}

const LEDGER_VERSION = 4

function emptyLedger(): TrainingLedger {
  return { version: LEDGER_VERSION, sessions: [], manualByDate: {} }
}

function normalizeLedger(parsed: Partial<TrainingLedger>): TrainingLedger {
  const incomingVersion = parsed.version ?? 1
  const rawSessions = Array.isArray(parsed.sessions) ? parsed.sessions : []
  const manualByDate = parsed.manualByDate ?? {}

  // v4+ ledgers are history-only; older versions may still have in-progress rows for migration.
  const sessions =
    incomingVersion >= LEDGER_VERSION ? rawSessions.filter(isHistorySession) : rawSessions

  const hasLoggedWorkouts = sessions.some(
    (session) => session.status === 'completed' || session.status === 'partial',
  )
  const manualDayCount = Object.values(manualByDate).filter((entries) => entries.length > 0).length

  // Drop legacy demo seed (v1) when the user has no real workout sessions.
  let manualByDateCleaned =
    parsed.version === 1 && !hasLoggedWorkouts && manualDayCount >= 5 ? {} : manualByDate

  if (incomingVersion < LEDGER_VERSION && manualDayCount > 0) {
    manualByDateCleaned = migrateManualDateKeysFromUtcStorageKeys(manualByDateCleaned)
  }

  return {
    version: LEDGER_VERSION,
    sessions,
    manualByDate: manualByDateCleaned,
  }
}

function migrateLegacySessions(ledger: TrainingLedger): TrainingLedger {
  try {
    const raw = localStorage.getItem(LEGACY_SESSIONS_KEY)
    if (!raw) return ledger

    const parsed = JSON.parse(raw) as { sessions?: WorkoutSession[] }
    const legacySessions = Array.isArray(parsed.sessions) ? parsed.sessions : []
    if (legacySessions.length === 0) return ledger

    const mergedIds = new Set(ledger.sessions.map((session) => session.id))
    const merged = [
      ...ledger.sessions,
      ...legacySessions.filter((session) => !mergedIds.has(session.id)),
    ]

    return { ...ledger, sessions: merged }
  } catch {
    return ledger
  }
}

export function loadLocalLedger(): TrainingLedger {
  try {
    const raw = localStorage.getItem(getLedgerKey())
    if (!raw) {
      const migrated = migrateLegacySessions(emptyLedger())
      saveLocalLedger(migrated)
      return migrated
    }

    const parsed = JSON.parse(raw) as Partial<TrainingLedger>
    const ledger = normalizeLedger(parsed)

    const migrated = migrateLegacySessions(ledger)
    const shouldPersist =
      (parsed.version ?? 1) < LEDGER_VERSION || migrated.sessions.length !== ledger.sessions.length

    if (shouldPersist) {
      saveLocalLedger(migrated)
    }

    return migrated
  } catch {
    const ledger = emptyLedger()
    saveLocalLedger(ledger)
    return ledger
  }
}

export function saveLocalLedger(ledger: TrainingLedger): void {
  localStorage.setItem(getLedgerKey(), JSON.stringify(ledger))
}

export function removeLegacySessionsKey(): void {
  localStorage.removeItem(LEGACY_SESSIONS_KEY)
}
