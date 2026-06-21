import { DEFAULT_PALETTE, type UserPalette } from '../types/training'
import { kvGet, kvSet } from '../adapters/localKeyValueStorage'

const PALETTE_KEY_BASE = 'userPalette'

let boundUserId: string | null = null

function getPaletteKey(): string {
  return boundUserId ? `${PALETTE_KEY_BASE}:${boundUserId}` : PALETTE_KEY_BASE
}

export function bindPreferencesUser(userId: string | null): void {
  if (userId && userId !== boundUserId) {
    migrateLegacyGlobalPalette(userId)
  }
  boundUserId = userId
}

function migrateLegacyGlobalPalette(userId: string): void {
  const globalRaw = kvGet(PALETTE_KEY_BASE)
  if (!globalRaw) return
  const userKey = `${PALETTE_KEY_BASE}:${userId}`
  if (!kvGet(userKey)) {
    kvSet(userKey, globalRaw)
  }
}

export function getUserPalette(): UserPalette {
  try {
    const raw = kvGet(getPaletteKey())
    if (raw) return JSON.parse(raw) as UserPalette
  } catch { /* fall through */ }
  return DEFAULT_PALETTE
}

export function saveUserPalette(palette: UserPalette): void {
  kvSet(getPaletteKey(), JSON.stringify(palette))
}
