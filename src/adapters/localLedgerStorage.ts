import type { TrainingLedger } from '../types/ledger'
import type { WorkoutSession } from '../types/workout'
import { migrateManualDateKeysFromUtcStorageKeys } from '../utils/activityHistory'

const LEDGER_KEY = 'workout-deck-ledger'
const LEGACY_SESSIONS_KEY = 'workout-deck-sessions'

const LEDGER_VERSION = 3

function emptyLedger(): TrainingLedger {
  return { version: LEDGER_VERSION, sessions: [], manualByDate: {} }
}

function normalizeLedger(parsed: Partial<TrainingLedger>): TrainingLedger {
  const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : []
  const manualByDate = parsed.manualByDate ?? {}

  const hasLoggedWorkouts = sessions.some(
    (session) => session.status === 'completed' || session.status === 'partial',
  )
  const manualDayCount = Object.values(manualByDate).filter((entries) => entries.length > 0).length

  // Drop legacy demo seed (v1) when the user has no real workout sessions.
  let manualByDateCleaned =
    parsed.version === 1 && !hasLoggedWorkouts && manualDayCount >= 5 ? {} : manualByDate

  const incomingVersion = parsed.version ?? 1
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

export function loadLedger(): TrainingLedger {
  try {
    const raw = localStorage.getItem(LEDGER_KEY)
    if (!raw) {
      const migrated = migrateLegacySessions(emptyLedger())
      saveLedger(migrated)
      return migrated
    }

    const parsed = JSON.parse(raw) as Partial<TrainingLedger>
    const ledger = normalizeLedger(parsed)

    const migrated = migrateLegacySessions(ledger)
    const shouldPersist =
      (parsed.version ?? 1) < LEDGER_VERSION || migrated.sessions.length !== ledger.sessions.length

    if (shouldPersist) {
      saveLedger(migrated)
    }

    return migrated
  } catch {
    const ledger = emptyLedger()
    saveLedger(ledger)
    return ledger
  }
}

export function saveLedger(ledger: TrainingLedger): void {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger))
}

export function removeLegacySessionsKey(): void {
  localStorage.removeItem(LEGACY_SESSIONS_KEY)
}
