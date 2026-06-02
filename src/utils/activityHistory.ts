import type { ActivityEntry, DayActivity, Intensity } from '../types/training'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
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
