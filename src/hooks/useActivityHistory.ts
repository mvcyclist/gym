import { useCallback, useMemo, useState } from 'react'
import { getWorkoutRecommendation } from '../services/recommendationService'
import {
  getLastSevenDays,
  updateManualActivities,
} from '../services/trainingLedgerService'
import type { ActivityEntry, DayActivity } from '../types/training'

export function useActivityHistory() {
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(() => {
    setRevision((value) => value + 1)
  }, [])

  const activityHistory = useMemo((): DayActivity[] => {
    void revision
    return getLastSevenDays()
  }, [revision])

  const recommendation = useMemo(
    () => getWorkoutRecommendation(activityHistory),
    [activityHistory],
  )

  const updateDayActivities = useCallback(
    (date: string, activities: ActivityEntry[]) => {
      updateManualActivities(date, activities)
      refresh()
    },
    [refresh],
  )

  return {
    activityHistory,
    recommendation,
    updateDayActivities,
    refresh,
  }
}
