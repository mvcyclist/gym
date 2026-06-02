import type { ActivityEntry, DayActivity, Intensity } from '../types/training'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Calendar date in the user's local timezone (YYYY-MM-DD). */
export function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDayLabel(date: Date): string {
  return DAY_LABELS[date.getDay()]
}

export function createActivityEntry(
  date: string,
  type: ActivityEntry['type'],
  partial?: Partial<Omit<ActivityEntry, 'id' | 'date' | 'type'>>,
): ActivityEntry {
  return {
    id: `${date}-${type}-${crypto.randomUUID().slice(0, 8)}`,
    date,
    type,
    ...partial,
  }
}

export function buildLastSevenDays(activitiesByDate: Record<string, ActivityEntry[]>): DayActivity[] {
  const today = new Date()
  const days: DayActivity[] = []

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const dateString = toDateString(date)

    days.push({
      date: dateString,
      dayLabel: offset === 0 ? 'Today' : formatDayLabel(date),
      activities: activitiesByDate[dateString] ?? [],
    })
  }

  return days
}

/**
 * Re-key manualByDate buckets saved with old `toISOString().slice(0, 10)` (UTC).
 * One-time when upgrading the ledger to v3.
 */
export function migrateManualDateKeysFromUtcStorageKeys(
  manualByDate: Record<string, ActivityEntry[]>,
): Record<string, ActivityEntry[]> {
  const merged: Record<string, ActivityEntry[]> = {}

  for (const [storedKey, entries] of Object.entries(manualByDate)) {
    const localKey = toDateString(new Date(`${storedKey}T00:00:00Z`))

    for (const entry of entries) {
      const normalized = { ...entry, date: localKey }
      merged[localKey] = [...(merged[localKey] ?? []), normalized]
    }
  }

  return merged
}

export function createInitialActivityHistory(): DayActivity[] {
  const today = new Date()
  const seed: Record<string, ActivityEntry[]> = {}

  const offsets = [6, 5, 4, 3, 2, 1, 0]
  const seedActivities: Array<Array<{ type: ActivityEntry['type']; intensity?: Intensity }>> = [
    [{ type: 'Walk' }],
    [{ type: 'Push', intensity: 'Moderate' }],
    [{ type: 'Swim', intensity: 'Moderate' }],
    [{ type: 'Pull', intensity: 'Moderate' }],
    [{ type: 'Rest' }],
    [{ type: 'Leg', intensity: 'Hard' }],
    [{ type: 'Bike', intensity: 'Hard' }],
  ]

  offsets.forEach((offset, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const dateString = toDateString(date)
    seed[dateString] = seedActivities[index].map((activity) =>
      createActivityEntry(dateString, activity.type, { intensity: activity.intensity }),
    )
  })

  return buildLastSevenDays(seed)
}
