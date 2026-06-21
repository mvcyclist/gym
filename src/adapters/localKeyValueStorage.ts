/**
 * Thin key-value adapter over localStorage.
 *
 * This is the only file that calls localStorage directly for non-ledger,
 * non-draft storage. On mobile, swap this module for an AsyncStorage
 * or SQLite equivalent with the same interface.
 *
 * Deliberately sync — async swap happens in Phase 5 when the mobile
 * shell is introduced.
 */

export function kvGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function kvSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable or quota exceeded — silently skip
  }
}

export function kvRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch { /* ignore */ }
}
