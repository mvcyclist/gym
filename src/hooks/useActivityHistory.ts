import { useCallback, useMemo, useState } from 'react'
import { getWorkoutRecommendation } from '../services/recommendationService'
import { buildLastSevenDays, createInitialActivityHistory } from '../utils/activityHistory'
import type { ActivityEntry, DayActivity } from '../types/training'

export function useActivityHistory() {
  const [activityHistory, setActivityHistory] = useState<DayActivity[]>(createInitialActivityHistory)

  const recommendation = useMemo(
    () => getWorkoutRecommendation(activityHistory),
    [activityHistory],
  )

  const updateDayActivities = useCallback((date: string, activities: ActivityEntry[]) => {
    setActivityHistory((current) => {
      const seed = Object.fromEntries(
        current.map((day) => [day.date, day.activities]),
      ) as Record<string, ActivityEntry[]>
      seed[date] = activities
      return buildLastSevenDays(seed)
    })
  }, [])

  return {
    activityHistory,
    recommendation,
    updateDayActivities,
  }
}
