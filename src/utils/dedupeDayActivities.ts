import type { ActivityEntry } from '../types/training'

function entryRank(entry: ActivityEntry): number {
  // Manual day logs (incl. replaceDayLog edits) win over workout sessions so
  // cloud-synced zombie sessions do not duplicate after the user fixes history.
  if (entry.source === 'manual') return 2
  if (entry.source === 'workout' && entry.sessionId) return 1
  return 0
}

/** One row per activity type on a calendar day for display and coaching reads. */
export function dedupeDayActivities(entries: ActivityEntry[]): ActivityEntry[] {
  const byType = new Map<string, ActivityEntry>()

  for (const entry of entries) {
    const existing = byType.get(entry.type)
    if (!existing) {
      byType.set(entry.type, entry)
      continue
    }

    const entryRankValue = entryRank(entry)
    const existingRankValue = entryRank(existing)

    if (entryRankValue > existingRankValue) {
      byType.set(entry.type, entry)
      continue
    }
    if (entryRankValue < existingRankValue) continue

    const entryDur = entry.durationMinutes ?? 0
    const existingDur = existing.durationMinutes ?? 0
    if (entryDur >= existingDur) {
      byType.set(entry.type, entry)
    }
  }

  return [...byType.values()]
}
