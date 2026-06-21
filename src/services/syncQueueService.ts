/**
 * Background cloud sync queue — local-first writes with retry.
 *
 * Failed ops persist per-user in localStorage (via kv adapter) and drain on
 * sign-in, focus, and online events.
 */
import {
  deleteSessionFromCloud,
  replaceManualDayOnCloud,
  upsertSessionToCloud,
} from '../adapters/supabaseLedgerStorage'
import { kvGet, kvSet } from '../adapters/localKeyValueStorage'
import { isSupabaseConfigured } from '../lib/supabase'
import type { ActivityEntry } from '../types/training'
import type { WorkoutSession } from '../types/workout'

const QUEUE_KEY_BASE = 'workout-deck-sync-queue'
const SYNC_META_KEY_BASE = 'workout-deck-sync-meta'

const MAX_ATTEMPTS = 6
const BASE_RETRY_MS = 2_000
const MAX_RETRY_MS = 5 * 60_000

type SyncOp =
  | {
      type: 'upsert-session'
      userId: string
      session: WorkoutSession
      enqueuedAt: string
      attempts: number
      nextRetryAt: number
    }
  | {
      type: 'delete-session'
      userId: string
      sessionId: string
      enqueuedAt: string
      attempts: number
      nextRetryAt: number
    }
  | {
      type: 'replace-manual-day'
      userId: string
      date: string
      activities: ActivityEntry[]
      enqueuedAt: string
      attempts: number
      nextRetryAt: number
    }

export type SyncState = 'idle' | 'syncing' | 'pending' | 'error'

export interface SyncStatus {
  state: SyncState
  pendingCount: number
  coachingMayBeStale: boolean
  lastSuccessAt: string | null
  lastError: string | null
}

interface SyncMeta {
  lastSuccessAt: string | null
  lastError: string | null
}

let boundUserId: string | null = null
let processing = false
let status: SyncStatus = {
  state: 'idle',
  pendingCount: 0,
  coachingMayBeStale: false,
  lastSuccessAt: null,
  lastError: null,
}

const listeners = new Set<() => void>()

function queueKey(userId: string): string {
  return `${QUEUE_KEY_BASE}:${userId}`
}

function metaKey(userId: string): string {
  return `${SYNC_META_KEY_BASE}:${userId}`
}

function loadMeta(userId: string): SyncMeta {
  try {
    const raw = kvGet(metaKey(userId))
    if (!raw) return { lastSuccessAt: null, lastError: null }
    return JSON.parse(raw) as SyncMeta
  } catch {
    return { lastSuccessAt: null, lastError: null }
  }
}

function saveMeta(userId: string, meta: SyncMeta): void {
  kvSet(metaKey(userId), JSON.stringify(meta))
}

function loadQueue(userId: string): SyncOp[] {
  try {
    const raw = kvGet(queueKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SyncOp[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveQueue(userId: string, queue: SyncOp[]): void {
  kvSet(queueKey(userId), JSON.stringify(queue))
}

function retryDelayMs(attempts: number): number {
  return Math.min(BASE_RETRY_MS * 2 ** Math.max(0, attempts - 1), MAX_RETRY_MS)
}

function computeStatus(userId: string | null, queue: SyncOp[]): SyncStatus {
  if (!userId || !isSupabaseConfigured()) {
    return {
      state: 'idle',
      pendingCount: 0,
      coachingMayBeStale: false,
      lastSuccessAt: null,
      lastError: null,
    }
  }

  const meta = loadMeta(userId)
  const pendingCount = queue.length
  const hasFailedOp = queue.some((op) => op.attempts > 0)
  const coachingMayBeStale =
    (pendingCount > 0 && hasFailedOp) || Boolean(meta.lastError)

  let state: SyncState = 'idle'
  if (processing) state = 'syncing'
  else if (pendingCount > 0 && hasFailedOp) state = 'error'
  else if (pendingCount > 0) state = 'pending'
  else if (meta.lastError) state = 'error'

  return {
    state,
    pendingCount,
    coachingMayBeStale,
    lastSuccessAt: meta.lastSuccessAt,
    lastError: meta.lastError,
  }
}

function refreshStatus(): void {
  const queue = boundUserId ? loadQueue(boundUserId) : []
  status = computeStatus(boundUserId, queue)
  listeners.forEach((listener) => listener())
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSyncStatus(): SyncStatus {
  return status
}

export function bindSyncQueueUser(userId: string | null): void {
  boundUserId = userId
  refreshStatus()
}

export function clearSyncQueue(userId: string): void {
  saveQueue(userId, [])
  saveMeta(userId, { lastSuccessAt: loadMeta(userId).lastSuccessAt, lastError: null })
  refreshStatus()
}

function enqueueOp(userId: string, op: SyncOp): void {
  const queue = loadQueue(userId)

  if (op.type === 'upsert-session') {
    const withoutDupes = queue.filter(
      (item) =>
        !(item.type === 'upsert-session' && item.session.id === op.session.id) &&
        !(item.type === 'delete-session' && item.sessionId === op.session.id),
    )
    withoutDupes.push(op)
    saveQueue(userId, withoutDupes)
  } else if (op.type === 'delete-session') {
    const withoutDupes = queue.filter(
      (item) =>
        !(item.type === 'upsert-session' && item.session.id === op.sessionId) &&
        !(item.type === 'delete-session' && item.sessionId === op.sessionId),
    )
    withoutDupes.push(op)
    saveQueue(userId, withoutDupes)
  } else {
    const withoutDupes = queue.filter(
      (item) => !(item.type === 'replace-manual-day' && item.date === op.date),
    )
    withoutDupes.push(op)
    saveQueue(userId, withoutDupes)
  }

  refreshStatus()
}

function createOpBase(
  userId: string,
): Pick<SyncOp, 'userId' | 'enqueuedAt' | 'attempts' | 'nextRetryAt'> {
  return {
    userId,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
    nextRetryAt: 0,
  }
}

export function enqueueSessionUpsert(userId: string, session: WorkoutSession): void {
  enqueueOp(userId, { type: 'upsert-session', session, ...createOpBase(userId) })
}

export function enqueueSessionDelete(userId: string, sessionId: string): void {
  enqueueOp(userId, { type: 'delete-session', sessionId, ...createOpBase(userId) })
}

export function enqueueManualDayReplace(
  userId: string,
  date: string,
  activities: ActivityEntry[],
): void {
  enqueueOp(userId, { type: 'replace-manual-day', date, activities, ...createOpBase(userId) })
}

async function executeOp(op: SyncOp): Promise<void> {
  if (op.type === 'upsert-session') {
    await upsertSessionToCloud(op.session, op.userId)
    return
  }
  if (op.type === 'delete-session') {
    await deleteSessionFromCloud(op.sessionId, op.userId)
    return
  }
  await replaceManualDayOnCloud(op.userId, op.date, op.activities)
}

export async function processSyncQueue(userId?: string | null): Promise<void> {
  const targetUserId = userId ?? boundUserId
  if (!targetUserId || !isSupabaseConfigured() || processing) return

  const queue = loadQueue(targetUserId)
  if (queue.length === 0) {
    refreshStatus()
    return
  }

  processing = true
  refreshStatus()

  const now = Date.now()
  let remaining = [...queue]
  let lastError: string | null = null
  let anySuccess = false

  try {
    for (const op of queue) {
      if (op.nextRetryAt > now) continue

      try {
        await executeOp(op)
        remaining = remaining.filter((item) => item !== op)
        anySuccess = true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sync failed'
        lastError = message
        const attempts = op.attempts + 1
        const failed: SyncOp = {
          ...op,
          attempts,
          nextRetryAt: Date.now() + retryDelayMs(attempts),
        }
        remaining = remaining.map((item) => (item === op ? failed : item))
        if (attempts >= MAX_ATTEMPTS) {
          console.error('[sync] op exceeded max attempts', op.type, error)
        }
      }
    }

    saveQueue(targetUserId, remaining)

    const meta = loadMeta(targetUserId)
    saveMeta(targetUserId, {
      lastSuccessAt:
        anySuccess && remaining.length === 0 ? new Date().toISOString() : meta.lastSuccessAt,
      lastError: remaining.length > 0 ? lastError : null,
    })
  } finally {
    processing = false
    refreshStatus()
  }
}

/** Push pending local changes, then pull cloud merge. Skips inbound merge during active workout. */
export async function syncLedgerWithCloud(
  userId: string,
  refreshMerged: (userId: string, options?: { force?: boolean }) => Promise<unknown>,
): Promise<void> {
  await processSyncQueue(userId)
  await refreshMerged(userId)
  refreshStatus()
}

export function recordHydrateFailure(userId: string, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Failed to refresh from cloud'
  const meta = loadMeta(userId)
  saveMeta(userId, { ...meta, lastError: message })
  refreshStatus()
}

export function recordHydrateSuccess(userId: string): void {
  saveMeta(userId, { lastSuccessAt: new Date().toISOString(), lastError: null })
  refreshStatus()
}
