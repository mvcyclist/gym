import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getTomorrowWorkoutRecommendation,
  getWorkoutRecommendation,
} from '../services/recommendationService'
import {
  hasEnoughHistoryForRecommendation,
  countDaysWithActivity,
} from '../services/recommendationReadiness'
import {
  getLastSevenDays,
  getSessionsForDate,
  saveBackfillDays,
  updateManualActivities,
  deleteCompletedSession,
} from '../services/trainingLedgerService'
import type { BackfillRow } from '../components/BackfillRecentActivityModal'
import { useAuth } from './useAuth'
import type { ActivityEntry, DayActivity, WorkoutRecommendation } from '../types/training'
import { toDateString } from '../utils/activityHistory'
import {
  buildTodayActivitySummary,
  buildWorkoutSessionSummary,
  type TodaySummary,
} from '../utils/workoutSummary'

export function useActivityHistory() {
  const { ledgerVersion } = useAuth()
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
    void ledgerVersion
    return getLastSevenDays()
  }, [ledgerVersion, revision])

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

  const todayLogged = useMemo(() => {
    const today = activityHistory.at(-1)
    return Boolean(today && today.activities.length > 0)
  }, [activityHistory])

  const todaySummary = useMemo((): TodaySummary | null => {
    const today = activityHistory.at(-1)
    if (!today || today.activities.length === 0) return null

    const sessions = getSessionsForDate(today.date).sort((a, b) => {
      const aTime = new Date(a.completedAt ?? a.updatedAt).getTime()
      const bTime = new Date(b.completedAt ?? b.updatedAt).getTime()
      return bTime - aTime
    })

    if (sessions.length > 0) {
      return buildWorkoutSessionSummary(sessions[0])
    }

    return buildTodayActivitySummary(today)
  }, [activityHistory])

  const tomorrowRecommendation = useMemo((): WorkoutRecommendation | null => {
    if (!todayLogged) return null
    return getTomorrowWorkoutRecommendation(activityHistory)
  }, [activityHistory, todayLogged])

  const updateDayActivities = useCallback(
    (date: string, activities: ActivityEntry[]) => {
      updateManualActivities(date, activities)
      refresh()
    },
    [refresh],
  )

  const deleteWorkoutSession = useCallback(
    (sessionId: string) => {
      deleteCompletedSession(sessionId)
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
    todayLogged,
    todaySummary,
    tomorrowRecommendation,
    updateDayActivities,
    deleteWorkoutSession,
    saveBackfill,
    refresh,
  }
}
