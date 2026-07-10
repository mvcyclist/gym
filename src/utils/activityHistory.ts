import type { ActivityEntry, DayActivity, Intensity } from '../types/training'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Calendar date in the user's local timezone (YYYY-MM-DD). */
export function toDateString(date: Date): string {
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const CALENDAR_DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parse YYYY-MM-DD (or ISO timestamp) to local noon for stable day diffs. */
export function parseCalendarDateKey(dateKey: string): Date | null {
  const trimmed = dateKey.trim()
  const match = CALENDAR_DATE_KEY.exec(trimmed)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(year, month - 1, day, 12, 0, 0, 0)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null
    }
    return date
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0)
}

export function daysSinceDateKey(dateKey: string, now: Date = new Date()): number | null {
  const then = parseCalendarDateKey(dateKey)
  if (!then) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  const diff = Math.floor((today.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
  return diff < 0 ? 0 : diff
}

export function formatCalendarDateLabel(dateKey: string): string {
  const date = parseCalendarDateKey(dateKey)
  if (!date) return dateKey
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDaysAgo(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

/** e.g. "Jul 5, 2026 · 3 days ago" or "today" */
export function formatLastWorkoutMeta(dateKey: string, now: Date = new Date()): string {
  const days = daysSinceDateKey(dateKey, now)
  if (days === null) return formatCalendarDateLabel(dateKey)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${formatCalendarDateLabel(dateKey)} · ${formatDaysAgo(days)}`
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
 * Legacy manual/backfill rows used `toISOString().slice(0, 10)`, so yesterday evening
 * in US timezones was often stored under today's date key (e.g. 2026-06-02 → meant 2026-06-01).
 */
export function resolveManualStorageKey(
  storedKey: string,
  todayKey = toDateString(new Date()),
): string {
  const localFromUtcMidnight = toDateString(new Date(`${storedKey}T00:00:00Z`))
  if (localFromUtcMidnight === storedKey) return storedKey

  if (storedKey === todayKey && localFromUtcMidnight < storedKey) {
    return localFromUtcMidnight
  }

  return storedKey
}

/** One-time when upgrading the ledger to v3. */
export function migrateManualDateKeysFromUtcStorageKeys(
  manualByDate: Record<string, ActivityEntry[]>,
): Record<string, ActivityEntry[]> {
  const todayKey = toDateString(new Date())
  const merged: Record<string, ActivityEntry[]> = {}

  for (const [storedKey, entries] of Object.entries(manualByDate)) {
    const localKey = resolveManualStorageKey(storedKey, todayKey)

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
