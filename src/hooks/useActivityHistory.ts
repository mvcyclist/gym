import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getTomorrowWorkoutRecommendation,
  getTodayRecommendation,
  getWeeklyPlan,
  type WeeklyPlanDay,
} from '../services/recommendationService'
import { countDaysWithActivity } from '../services/recommendationReadiness'
import {
  getLastSevenDays,
  getSessionsForDate,
} from '../services/historyQueryService'
import {
  deleteCompletedSession,
  getPlanOverrides,
  replaceDayLog,
  saveBackfillDays,
  updateManualActivities,
  updatePlanOverride,
} from '../services/trainingLedgerService'
import type { BackfillRow } from '../components/BackfillRecentActivityModal'
import { useAuth } from './useAuth'
import type { ActivityEntry, ActivityType, DayActivity, RecommendationResult, WorkoutRecommendation } from '../types/training'
import { toDateString } from '../utils/activityHistory'
import {
  buildTodayActivitySummary,
  buildWorkoutSessionSummary,
  type TodaySummary,
} from '../utils/workoutSummary'
import { getUserProfile } from '../services/userProfileRepository'
import {
  getScheduledForwardDays,
  type ScheduledDay,
} from '../services/weeklyPlanFromProfile'
import { reseedPlanOverridesFromProfile } from '../services/onboardingService'

function scheduledToWeeklyPlanDay(day: ScheduledDay): WeeklyPlanDay {
  const workoutType: WorkoutRecommendation['workoutType'] =
    day.type === 'Swim' ||
    day.type === 'Bike' ||
    day.type === 'Run' ||
    day.type === 'Walk' ||
    day.type === 'HIIT'
      ? 'Mobility'
      : day.type === 'Other'
        ? 'Rest'
        : (day.type as WorkoutRecommendation['workoutType'])

  return {
    date: day.date,
    dayLabel: day.dayLabel,
    displayType: day.type,
    recommendation: {
      workoutType,
      title: day.type === 'Rest' ? 'Rest day' : `${day.type} day`,
      reason: day.source === 'override' ? 'From your weekly plan.' : 'From your program schedule.',
    },
  }
}

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

  // Ensure onboarding program lands on Home even if overrides were never seeded.
  useEffect(() => {
    const profile = getUserProfile()
    if (!profile.onboardingComplete) return
    const overrides = getPlanOverrides()
    const today = toDateString(new Date())
    if (!overrides[today]?.length) {
      reseedPlanOverridesFromProfile(profile)
      refresh()
    }
  }, [ledgerVersion, refresh])

  const activityHistory = useMemo((): DayActivity[] => {
    void revision
    void ledgerVersion
    return getLastSevenDays()
  }, [ledgerVersion, revision])

  const activeDaysCount = useMemo(
    () => countDaysWithActivity(activityHistory),
    [activityHistory],
  )

  const recommendation = useMemo((): RecommendationResult | null => {
    return getTodayRecommendation(activityHistory)
  }, [activityHistory])

  const recommendationReady = recommendation !== null

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

  const planOverrides = useMemo((): Record<string, ActivityType[]> => {
    void revision
    void ledgerVersion
    return getPlanOverrides()
  }, [ledgerVersion, revision])

  const weeklyPlan = useMemo((): WeeklyPlanDay[] => {
    void revision
    void ledgerVersion
    const profile = getUserProfile()
    if (profile.onboardingComplete) {
      return getScheduledForwardDays(profile, getPlanOverrides(), 7).map(scheduledToWeeklyPlanDay)
    }
    if (!recommendationReady) return []
    return getWeeklyPlan(activityHistory)
  }, [activityHistory, ledgerVersion, recommendationReady, revision])

  const scheduledToday = useMemo((): ScheduledDay | null => {
    void revision
    void ledgerVersion
    const profile = getUserProfile()
    if (!profile.onboardingComplete) return null
    return getScheduledForwardDays(profile, getPlanOverrides(), 1)[0] ?? null
  }, [ledgerVersion, revision])

  const replaceDayActivities = useCallback(
    (date: string, types: ActivityType[]) => {
      replaceDayLog(date, types)
      refresh()
    },
    [refresh],
  )

  const updateDayActivities = useCallback(
    (date: string, activities: ActivityEntry[]) => {
      updateManualActivities(date, activities)
      refresh()
    },
    [refresh],
  )

  const setPlanOverride = useCallback(
    (date: string, activityTypes: ActivityType[]) => {
      updatePlanOverride(date, activityTypes)
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
    scheduledToday,
    todayLogged,
    todaySummary,
    tomorrowRecommendation,
    weeklyPlan,
    planOverrides,
    replaceDayActivities,
    updateDayActivities,
    setPlanOverride,
    deleteWorkoutSession,
    saveBackfill,
    refresh,
  } as const
}
