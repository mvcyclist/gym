import type { DayActivity, RecommendedWorkoutType, WorkoutRecommendation, WorkoutType } from '../types/training'
import { getRecommendation } from './recommendationEngine'
import { getUserPalette } from './preferencesRepository'
import { formatDayLabel, toDateString } from '../utils/activityHistory'

// ─── Type bridge ─────────────────────────────────────────────────────────────

function toRecommendedType(type: WorkoutType): RecommendedWorkoutType {
  if (type === 'Run' || type === 'Swim' || type === 'Bike' || type === 'Walk') return 'Mobility'
  return type as RecommendedWorkoutType
}

function titleFor(type: WorkoutType): string {
  if (type === 'Rest') return 'Rest day'
  if (type === 'Walk' || type === 'Mobility') return 'Mobility & recovery'
  return `${type} day`
}

// ─── Tomorrow recommendation ──────────────────────────────────────────────────

export function getTomorrowWorkoutRecommendation(
  activityHistory: DayActivity[],
): WorkoutRecommendation | null {
  const sorted = [...activityHistory].sort((a, b) => a.date.localeCompare(b.date))
  const today = sorted.at(-1)
  if (!today || today.activities.length === 0) return null

  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = toDateString(tomorrowDate)

  const tomorrowSlot: DayActivity = {
    date: tomorrowStr,
    dayLabel: formatDayLabel(tomorrowDate),
    activities: [],
  }

  const result = getRecommendation([...sorted, tomorrowSlot], getUserPalette(), tomorrowDate)
  if (!result) return null

  const { type, reason, warning } = result.primary
  return {
    workoutType: toRecommendedType(type),
    title: titleFor(type),
    reason,
    warnings: warning ? [warning] : undefined,
  }
}

// ─── Weekly plan ──────────────────────────────────────────────────────────────

export interface WeeklyPlanDay {
  date: string
  dayLabel: string
  recommendation: WorkoutRecommendation
  displayType: string
}

export function getWeeklyPlan(activityHistory: DayActivity[]): WeeklyPlanDay[] {
  const plan: WeeklyPlanDay[] = []
  const projected = [...activityHistory].sort((a, b) => a.date.localeCompare(b.date))
  const palette = getUserPalette()

  for (let i = 0; i < 7; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = toDateString(date)
    const dayLabel = formatDayLabel(date)

    const historyForDay = projected.filter((d) => d.date !== dateStr)
    const daySlot: DayActivity = { date: dateStr, dayLabel, activities: [] }

    const result = getRecommendation([...historyForDay, daySlot], palette, date)
    if (!result) continue

    const { type, reason, warning } = result.primary
    const displayType = type
    const workoutType = toRecommendedType(type)

    plan.push({
      date: dateStr,
      dayLabel,
      recommendation: {
        workoutType,
        title: titleFor(type),
        reason,
        warnings: warning ? [warning] : undefined,
      },
      displayType,
    })

    projected.push({
      date: dateStr,
      dayLabel,
      activities: [{
        id: `projected-${dateStr}`,
        date: dateStr,
        type: displayType as DayActivity['activities'][number]['type'],
        intensity: 'Moderate',
        source: 'manual',
      }],
    })
  }

  return plan
}
