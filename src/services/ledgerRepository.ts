import {
  deleteSessionFromCloud,
  fetchLedgerFromCloud,
  importLedgerToCloud,
  purgeInProgressSessionsFromCloud,
  replaceCloudLedgerWithLocal,
} from '../adapters/supabaseLedgerStorage'
import { bindDraftStorageUser, hasDraft } from '../adapters/workoutDraftStorage'
import { bindLocalLedgerUser, loadLocalLedger, saveLocalLedger } from '../adapters/localLedgerStorage'
import { bindPreferencesUser } from './preferencesRepository'
import { kvGet, kvSet } from '../adapters/localKeyValueStorage'
import { isDraftableSessionStatus } from '../types/draft'
import { migrateLedgerInProgressToDraft } from './workoutDraftMigration'
import {
  bindSyncQueueUser,
  clearSyncQueue,
  enqueueManualDayReplace,
  enqueuePlanOverrideReplace,
  enqueueSessionDelete,
  enqueueSessionUpsert,
  processSyncQueue,
  recordHydrateSuccess,
} from './syncQueueService'
import { isSupabaseConfigured } from '../lib/supabase'
import type { ActivityEntry, ActivityType } from '../types/training'
import type { TrainingLedger } from '../types/ledger'
import type { WorkoutSession } from '../types/workout'
import {
  countManualActivities,
  countSyncedSessions,
  hasMeaningfulLedger,
  mergeLedgers,
  shouldPreferLocalLedger,
} from '../utils/ledgerStats'

const IMPORT_PROMPT_KEY_BASE = 'workout-deck-import-prompted'

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
  bindDraftStorageUser(null)
  bindLocalLedgerUser(null)
  bindPreferencesUser(null)
  bindSyncQueueUser(null)
}

export function bindLedgerToUser(userId: string | null): void {
  syncUserId = userId
  memoryLedger = null
  bindDraftStorageUser(userId)
  bindLocalLedgerUser(userId)
  bindPreferencesUser(userId)
  bindSyncQueueUser(userId)
}

function purgeInProgressFromCloud(sessionIds: string[]): void {
  if (!syncUserId) return

  for (const sessionId of sessionIds) {
    void deleteSessionFromCloud(sessionId, syncUserId).catch((error) => {
      console.error('[ledger] failed to delete in-progress session from cloud', error)
    })
  }
}

async function purgeLegacyInProgressFromCloud(userId: string): Promise<void> {
  try {
    const removedIds = await purgeInProgressSessionsFromCloud(userId)
    if (removedIds.length > 0) {
      console.info('[ledger] purged legacy in-progress sessions from cloud', removedIds)
    }
  } catch (error) {
    console.error('[ledger] failed to purge in-progress sessions from cloud', error)
  }
}

function applyInProgressMigration(ledger: TrainingLedger): TrainingLedger {
  const { ledger: migrated, removedInProgressIds } = migrateLedgerInProgressToDraft(ledger)

  if (removedInProgressIds.length === 0) {
    return ledger
  }

  purgeInProgressFromCloud(removedInProgressIds)
  const cleaned: TrainingLedger = { ...migrated, version: 4 }
  persistLedger(cleaned)
  return cleaned
}

export async function refreshMergedLedgerFromCloud(
  userId: string,
  options?: { force?: boolean },
): Promise<TrainingLedger> {
  if (!options?.force && hasDraft()) {
    return loadLedger()
  }

  const cloud = await fetchLedgerFromCloud(userId)
  const local = loadLocalLedger()
  const merged = mergeLedgers(local, cloud)
  const ledger = applyInProgressMigration(merged)

  memoryLedger = ledger
  saveLocalLedger(ledger)
  await purgeLegacyInProgressFromCloud(userId)
  recordHydrateSuccess(userId)
  return ledger
}

export async function hydrateLedgerFromCloud(userId: string): Promise<TrainingLedger> {
  return refreshMergedLedgerFromCloud(userId)
}

export function getDeviceLedgerSummary(): {
  sessions: number
  manualActivities: number
} {
  const ledger = loadLocalLedger()
  return {
    sessions: countSyncedSessions(ledger),
    manualActivities: countManualActivities(ledger),
  }
}

export async function pushDeviceHistoryToCloud(userId: string): Promise<TrainingLedger> {
  const local = applyInProgressMigration(loadLocalLedger())
  await replaceCloudLedgerWithLocal(userId, local)
  clearSyncQueue(userId)
  markImportPromptShown(userId)
  memoryLedger = local
  saveLocalLedger(local)
  return local
}

export async function pullLedgerFromCloud(userId: string): Promise<TrainingLedger> {
  const cloud = await fetchLedgerFromCloud(userId)
  const ledger = applyInProgressMigration(cloud)
  memoryLedger = ledger
  saveLocalLedger(ledger)
  clearSyncQueue(userId)
  await purgeLegacyInProgressFromCloud(userId)
  recordHydrateSuccess(userId)
  return ledger
}

export function loadLedger(): TrainingLedger {
  if (memoryLedger) return memoryLedger

  const local = loadLocalLedger()
  memoryLedger = applyInProgressMigration(local)
  return memoryLedger
}

function persistLedger(ledger: TrainingLedger): void {
  memoryLedger = ledger
  saveLocalLedger(ledger)
}

export function saveLedger(ledger: TrainingLedger): void {
  persistLedger(ledger)
}

export async function upsertSession(session: WorkoutSession): Promise<void> {
  if (isDraftableSessionStatus(session.status)) {
    throw new Error(
      `[ledger] session ${session.id} is ${session.status} — in-progress workouts belong in draft storage`,
    )
  }

  const ledger = loadLedger()
  const index = ledger.sessions.findIndex((item) => item.id === session.id)

  if (index >= 0) {
    ledger.sessions[index] = session
  } else {
    ledger.sessions.unshift(session)
  }

  persistLedger(ledger)

  if (syncUserId) {
    enqueueSessionUpsert(syncUserId, session)
    void processSyncQueue(syncUserId)
  }
}

export function removeSession(sessionId: string): void {
  const ledger = loadLedger()
  ledger.sessions = ledger.sessions.filter((session) => session.id !== sessionId)
  persistLedger(ledger)

  if (syncUserId) {
    enqueueSessionDelete(syncUserId, sessionId)
    void processSyncQueue(syncUserId)
  }
}

export function replaceManualActivities(date: string, activities: ActivityEntry[]): void {
  const ledger = loadLedger()
  ledger.manualByDate[date] = activities
  persistLedger(ledger)

  if (syncUserId) {
    enqueueManualDayReplace(syncUserId, date, activities)
    void processSyncQueue(syncUserId)
  }
}

export function getPlanOverrides(): Record<string, ActivityType[]> {
  return { ...(loadLedger().planOverridesByDate ?? {}) }
}

export function replacePlanOverride(date: string, activityTypes: ActivityType[]): void {
  const ledger = loadLedger()
  const next = { ...(ledger.planOverridesByDate ?? {}) }

  if (activityTypes.length === 0) {
    delete next[date]
  } else {
    next[date] = activityTypes
  }

  ledger.planOverridesByDate = next
  persistLedger(ledger)

  if (syncUserId) {
    enqueuePlanOverrideReplace(syncUserId, date, activityTypes)
    void processSyncQueue(syncUserId)
  }
}

export function hasMeaningfulLocalLedger(): boolean {
  return hasMeaningfulLedger(loadLocalLedger())
}

function importPromptKey(userId: string): string {
  return `${IMPORT_PROMPT_KEY_BASE}:${userId}`
}

function migrateLegacyImportPrompt(userId: string): boolean {
  const raw = kvGet(IMPORT_PROMPT_KEY_BASE)
  if (!raw) return false
  try {
    const prompted = JSON.parse(raw) as string[]
    if (prompted.includes(userId)) {
      kvSet(importPromptKey(userId), '1')
      return true
    }
  } catch { /* ignore */ }
  return false
}

export function wasImportPromptShown(userId: string): boolean {
  if (kvGet(importPromptKey(userId)) === '1') return true
  return migrateLegacyImportPrompt(userId)
}

export function markImportPromptShown(userId: string): void {
  kvSet(importPromptKey(userId), '1')
}

export async function shouldOfferLocalImport(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  if (wasImportPromptShown(userId)) return false
  if (!hasMeaningfulLocalLedger()) return false

  const cloud = await fetchLedgerFromCloud(userId)
  const local = loadLocalLedger()
  if (!shouldPreferLocalLedger(local, cloud)) return false

  return !hasMeaningfulLedger(cloud)
}

export async function importLocalLedgerToCloud(userId: string): Promise<TrainingLedger> {
  const local = applyInProgressMigration(loadLocalLedger())
  await importLedgerToCloud(userId, local)
  clearSyncQueue(userId)
  markImportPromptShown(userId)
  memoryLedger = local
  return local
}

export function skipLocalImport(userId: string): void {
  markImportPromptShown(userId)
}
