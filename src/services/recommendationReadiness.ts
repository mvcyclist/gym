import type { DayActivity } from '../types/training'

export const RECOMMENDATION_MIN_ACTIVE_DAYS = 3

export function countDaysWithActivity(days: DayActivity[]): number {
  return days.filter((day) => day.activities.length > 0).length
}

export function hasEnoughHistoryForRecommendation(days: DayActivity[]): boolean {
  return countDaysWithActivity(days) >= RECOMMENDATION_MIN_ACTIVE_DAYS
}

export function getDaysUntilRecommendationReady(days: DayActivity[]): number {
  const active = countDaysWithActivity(days)
  return Math.max(0, RECOMMENDATION_MIN_ACTIVE_DAYS - active)
}
