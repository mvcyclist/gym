import {
  deleteSessionFromCloud,
  fetchLedgerFromCloud,
  importLedgerToCloud,
  isCloudLedgerEmpty,
  replaceManualDayOnCloud,
  upsertSessionToCloud,
} from '../adapters/supabaseLedgerStorage'
import { loadLocalLedger, saveLocalLedger } from '../adapters/localLedgerStorage'
import { isSupabaseConfigured } from '../lib/supabase'
import type { ActivityEntry } from '../types/training'
import type { TrainingLedger } from '../types/ledger'
import type { WorkoutSession } from '../types/workout'

const IMPORT_PROMPT_KEY = 'workout-deck-import-prompted'

let memoryLedger: TrainingLedger | null = null
let syncUserId: string | null = null

export function isCloudSyncEnabled(): boolean {
  return isSupabaseConfigured() && syncUserId !== null
}

export function getSyncUserId(): string | null {
  return syncUserId
}

export function resetLedgerRepository(): void {
  memoryLedger = null
  syncUserId = null
}

export function bindLedgerToUser(userId: string | null): void {
  syncUserId = userId
  memoryLedger = null
}

export async function hydrateLedgerFromCloud(userId: string): Promise<TrainingLedger> {
  const ledger = await fetchLedgerFromCloud(userId)
  memoryLedger = ledger
  saveLocalLedger(ledger)
  return ledger
}

export function loadLedger(): TrainingLedger {
  if (memoryLedger) return memoryLedger
  memoryLedger = loadLocalLedger()
  return memoryLedger
}

function persistLedger(ledger: TrainingLedger): void {
  memoryLedger = ledger
  saveLocalLedger(ledger)
}

export function saveLedger(ledger: TrainingLedger): void {
  persistLedger(ledger)
}

export function upsertSession(session: WorkoutSession): void {
  const ledger = loadLedger()
  const index = ledger.sessions.findIndex((item) => item.id === session.id)

  if (index >= 0) {
    ledger.sessions[index] = session
  } else {
    ledger.sessions.unshift(session)
  }

  persistLedger(ledger)

  if (syncUserId) {
    void upsertSessionToCloud(session, syncUserId).catch((error) => {
      console.error('[ledger] failed to sync session', error)
    })
  }
}

export function removeSession(sessionId: string): void {
  const ledger = loadLedger()
  ledger.sessions = ledger.sessions.filter((session) => session.id !== sessionId)
  persistLedger(ledger)

  if (syncUserId) {
    void deleteSessionFromCloud(sessionId, syncUserId).catch((error) => {
      console.error('[ledger] failed to delete session', error)
    })
  }
}

export function replaceManualActivities(date: string, activities: ActivityEntry[]): void {
  const ledger = loadLedger()
  ledger.manualByDate[date] = activities
  persistLedger(ledger)

  if (syncUserId) {
    void replaceManualDayOnCloud(syncUserId, date, activities).catch((error) => {
      console.error('[ledger] failed to sync manual activities', error)
    })
  }
}

export function hasMeaningfulLocalLedger(): boolean {
  const ledger = loadLocalLedger()
  const hasSessions = ledger.sessions.some(
    (session) => session.status === 'completed' || session.status === 'partial',
  )
  const hasManual = Object.values(ledger.manualByDate).some((entries) => entries.length > 0)
  return hasSessions || hasManual
}

export function wasImportPromptShown(userId: string): boolean {
  try {
    const raw = localStorage.getItem(IMPORT_PROMPT_KEY)
    if (!raw) return false
    const prompted = JSON.parse(raw) as string[]
    return prompted.includes(userId)
  } catch {
    return false
  }
}

export function markImportPromptShown(userId: string): void {
  try {
    const raw = localStorage.getItem(IMPORT_PROMPT_KEY)
    const prompted = raw ? (JSON.parse(raw) as string[]) : []
    if (!prompted.includes(userId)) {
      prompted.push(userId)
      localStorage.setItem(IMPORT_PROMPT_KEY, JSON.stringify(prompted))
    }
  } catch {
    localStorage.setItem(IMPORT_PROMPT_KEY, JSON.stringify([userId]))
  }
}

export async function shouldOfferLocalImport(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  if (wasImportPromptShown(userId)) return false
  if (!hasMeaningfulLocalLedger()) return false
  return isCloudLedgerEmpty(userId)
}

export async function importLocalLedgerToCloud(userId: string): Promise<TrainingLedger> {
  const local = loadLocalLedger()
  await importLedgerToCloud(userId, local)
  markImportPromptShown(userId)
  memoryLedger = local
  saveLocalLedger(local)
  return local
}

export function skipLocalImport(userId: string): void {
  markImportPromptShown(userId)
}
