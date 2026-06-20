import {
  isDraftableSessionStatus,
  WORKOUT_DRAFT_VERSION,
  type WorkoutDraft,
} from '../types/draft'
import type { WorkoutSession } from '../types/workout'

const DRAFT_KEY_BASE = 'workout-deck-draft'

let boundUserId: string | null = null

export function bindDraftStorageUser(userId: string | null): void {
  if (userId) {
    migrateLegacyGlobalDraft(userId)
  }
  boundUserId = userId
}

function migrateLegacyGlobalDraft(userId: string): void {
  const legacyRaw = localStorage.getItem(DRAFT_KEY_BASE)
  if (!legacyRaw) return

  const userKey = getDraftStorageKey(userId)
  const userRaw = localStorage.getItem(userKey)

  if (!userRaw) {
    localStorage.setItem(userKey, legacyRaw)
  } else {
    try {
      const legacy = JSON.parse(legacyRaw) as Partial<WorkoutDraft>
      const existing = JSON.parse(userRaw) as Partial<WorkoutDraft>
      const legacySavedAt = legacy.savedAt ?? ''
      const existingSavedAt = existing.savedAt ?? ''
      if (legacySavedAt.localeCompare(existingSavedAt) > 0) {
        localStorage.setItem(userKey, legacyRaw)
      }
    } catch {
      localStorage.setItem(userKey, legacyRaw)
    }
  }

  localStorage.removeItem(DRAFT_KEY_BASE)
}

export function getDraftStorageKey(userId: string | null = boundUserId): string {
  return userId ? `${DRAFT_KEY_BASE}:${userId}` : DRAFT_KEY_BASE
}

function draftStorageKey(): string {
  return getDraftStorageKey(boundUserId)
}

function isValidSession(value: unknown): value is WorkoutSession {
  if (!value || typeof value !== 'object') return false
  const session = value as WorkoutSession
  return (
    typeof session.id === 'string' &&
    typeof session.workoutType === 'string' &&
    typeof session.status === 'string' &&
    typeof session.startedAt === 'string' &&
    Array.isArray(session.exercises)
  )
}

function normalizeDraft(parsed: Partial<WorkoutDraft>): WorkoutDraft | null {
  if (!isValidSession(parsed.session)) return null
  if (!isDraftableSessionStatus(parsed.session.status)) return null

  return {
    version: parsed.version ?? WORKOUT_DRAFT_VERSION,
    session: parsed.session,
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
  }
}

export function loadDraft(): WorkoutSession | null {
  try {
    const raw = localStorage.getItem(draftStorageKey())
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<WorkoutDraft>
    const draft = normalizeDraft(parsed)
    if (!draft) {
      clearDraft()
      return null
    }

    return draft.session
  } catch {
    clearDraft()
    return null
  }
}

export function saveDraft(session: WorkoutSession): void {
  if (!isDraftableSessionStatus(session.status)) {
    throw new Error(
      `[draft] cannot save session with status "${session.status}" — only active or paused`,
    )
  }

  const draft: WorkoutDraft = {
    version: WORKOUT_DRAFT_VERSION,
    session,
    savedAt: new Date().toISOString(),
  }

  localStorage.setItem(draftStorageKey(), JSON.stringify(draft))
}

export function clearDraft(): void {
  localStorage.removeItem(draftStorageKey())
}

export function hasDraft(): boolean {
  return loadDraft() !== null
}
