import type { TrainingLedger } from '../types/ledger'
import type { WorkoutSession } from '../types/workout'

const LEDGER_KEY = 'workout-deck-ledger'
const LEGACY_SESSIONS_KEY = 'workout-deck-sessions'

function emptyLedger(): TrainingLedger {
  return { version: 1, sessions: [], manualByDate: {} }
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

    const parsed = JSON.parse(raw) as TrainingLedger
    const ledger: TrainingLedger = {
      version: 1,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      manualByDate: parsed.manualByDate ?? {},
    }

    const migrated = migrateLegacySessions(ledger)
    if (migrated.sessions.length !== ledger.sessions.length) {
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
