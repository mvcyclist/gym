import { useCallback, useEffect, useMemo, useState } from 'react'
import { getWorkoutRecommendation } from '../services/recommendationService'
import {
  hasEnoughHistoryForRecommendation,
  countDaysWithActivity,
} from '../services/recommendationReadiness'
import {
  getLastSevenDays,
  saveBackfillDays,
  updateManualActivities,
} from '../services/trainingLedgerService'
import type { BackfillRow } from '../components/BackfillRecentActivityModal'
import type { ActivityEntry, DayActivity, WorkoutRecommendation } from '../types/training'
import { toDateString } from '../utils/activityHistory'

export function useActivityHistory() {
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(() => {
    setRevision((value) => value + 1)
  }, [])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => {
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [refresh])

  const activityHistory = useMemo((): DayActivity[] => {
    void revision
    return getLastSevenDays()
  }, [revision])

  const activeDaysCount = useMemo(
    () => countDaysWithActivity(activityHistory),
    [activityHistory],
  )

  const recommendationReady = useMemo(
    () => hasEnoughHistoryForRecommendation(activityHistory),
    [activityHistory],
  )

  const recommendation = useMemo((): WorkoutRecommendation | null => {
    if (!recommendationReady) return null
    return getWorkoutRecommendation(activityHistory)
  }, [activityHistory, recommendationReady])

  const updateDayActivities = useCallback(
    (date: string, activities: ActivityEntry[]) => {
      updateManualActivities(date, activities)
      refresh()
    },
    [refresh],
  )

  const saveBackfill = useCallback(
    (rows: BackfillRow[]) => {
      const today = new Date()
      const payload = rows
        .filter((row) => row.enabled && row.type)
        .map((row) => {
          const date = new Date(today)
          date.setDate(today.getDate() - row.offset)
          return {
            date: toDateString(date),
            activities: [{ type: row.type!, intensity: row.intensity }],
          }
        })

      saveBackfillDays(payload)
      refresh()
    },
    [refresh],
  )

  return {
    activityHistory,
    activeDaysCount,
    recommendationReady,
    recommendation,
    updateDayActivities,
    saveBackfill,
    refresh,
  }
}
