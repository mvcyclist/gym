import { useCallback, useState } from 'react'
import type { WorkoutCategory } from '../types/workout'
import type { ActivityEntry, DayActivity, RecommendationResult, WorkoutRecommendation, WorkoutType } from '../types/training'
import { BackfillRecentActivityModal } from './BackfillRecentActivityModal'
import { ChooseAnotherModal } from './ChooseAnotherModal'
import { EditActivityModal } from './EditActivityModal'
import { GettingStartedCard } from './GettingStartedCard'
import { SnakeDayTile } from './SnakeDayTile'
import { TodayFocusCard } from './TodayFocusCard'
import type { TodaySummary } from '../utils/workoutSummary'
import type { WeeklyPlanDay } from '../services/recommendationService'

interface WorkoutSelectorProps {
  activityHistory: DayActivity[]
  activeDaysCount: number
  recommendationReady: boolean
  recommendation: RecommendationResult | null
  todayLogged: boolean
  todaySummary: TodaySummary | null
  tomorrowRecommendation: WorkoutRecommendation | null
  weeklyPlan: WeeklyPlanDay[]
  onUpdateDayActivities: (date: string, activities: ActivityEntry[]) => void
  onDeleteWorkoutSession: (sessionId: string) => void
  onSaveBackfill: (rows: import('./BackfillRecentActivityModal').BackfillRow[]) => void
  onStartRecommendation: () => void
  onSelectWorkout: (workoutId: WorkoutCategory) => void
  onSelectCardio: (type: WorkoutType) => void
  onSelectTimer: () => void
  onSelectCore: () => void
  onSelectMobility: () => void
}

export function WorkoutSelector({
  activityHistory,
  activeDaysCount,
  recommendationReady,
  recommendation,
  todayLogged,
  todaySummary,
  tomorrowRecommendation,
  weeklyPlan,
  onUpdateDayActivities,
  onDeleteWorkoutSession,
  onSaveBackfill,
  onStartRecommendation,
  onSelectWorkout,
  onSelectCardio,
  onSelectTimer,
  onSelectCore,
  onSelectMobility,
}: WorkoutSelectorProps) {
  const [editingDay, setEditingDay] = useState<DayActivity | null>(null)
  const [backfillOpen, setBackfillOpen] = useState(false)
  const [chooseOpen, setChooseOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)

  const pastDays = activityHistory.slice(0, -1)
  const futureDays = weeklyPlan.slice(1)

  const handleDeleteWorkoutSession = useCallback(
    (sessionId: string) => {
      onDeleteWorkoutSession(sessionId)
      setEditingDay((current) => {
        if (!current) return null
        return {
          ...current,
          activities: current.activities.filter((a) => a.sessionId !== sessionId),
        }
      })
    },
    [onDeleteWorkoutSession],
  )

  const showSnake = recommendationReady && (recommendation || todayLogged)

  return (
    <>
      <section className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 sm:py-12">

        {showSnake ? (
          <div className="flex flex-col gap-3">

            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 transition hover:text-zinc-300"
            >
              <span className="transition-transform duration-200" style={{ display: 'inline-block', transform: historyOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▴
              </span>
              Last 7 days
              <span className="ml-auto text-zinc-600">
                {pastDays.slice(-5).map(d => d.dayLabel.slice(0, 3)).join(' · ')}
              </span>
            </button>

            {historyOpen && (
              <div className="grid grid-cols-5 gap-2">
                {pastDays.slice(-5).map((day) => (
                  <SnakeDayTile
                    key={day.date}
                    day={day}
                    variant="past"
                    onClick={() => setEditingDay(day)}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                today
              </span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <TodayFocusCard
              recommendation={recommendation}
              todayLogged={todayLogged}
              todaySummary={todaySummary}
              tomorrowRecommendation={tomorrowRecommendation}
              onStart={onStartRecommendation}
              onChooseAnother={() => setChooseOpen(true)}
            />

            {weeklyPlan.length > 1 && (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    plan
                  </span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>

                <button
                  type="button"
                  onClick={() => setPlanOpen((o) => !o)}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 transition hover:text-zinc-300"
                >
                  <span className="transition-transform duration-200" style={{ display: 'inline-block', transform: planOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▾
                  </span>
                  Next 7 days
                  <span className="ml-auto text-zinc-600">
                    {futureDays.slice(0, 5).map(d => d.dayLabel.slice(0, 3)).join(' · ')}
                  </span>
                </button>

                {planOpen && (
                  <div className="grid grid-cols-5 gap-2">
                    {futureDays.slice(0, 5).map((planDay) => (
                      <SnakeDayTile
                        key={planDay.date}
                        day={{ date: planDay.date, dayLabel: planDay.dayLabel, activities: [] }}
                        variant="future"
                        displayType={planDay.displayType}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        ) : (
          <GettingStartedCard
            activeDaysCount={activeDaysCount}
            onStartWorkout={() => setChooseOpen(true)}
            onLogRecentDays={() => setBackfillOpen(true)}
          />
        )}

      </section>

      <ChooseAnotherModal
        open={chooseOpen}
        alternatives={recommendation?.alternatives ?? []}
        onClose={() => setChooseOpen(false)}
        onSelectWorkout={onSelectWorkout}
        onSelectCardio={onSelectCardio}
        onSelectCore={onSelectCore}
        onSelectMobility={onSelectMobility}
        onSelectTimer={onSelectTimer}
      />

      <EditActivityModal
        day={editingDay}
        onClose={() => setEditingDay(null)}
        onSave={onUpdateDayActivities}
        onDeleteWorkout={handleDeleteWorkoutSession}
      />

      <BackfillRecentActivityModal
        open={backfillOpen}
        onClose={() => setBackfillOpen(false)}
        onSave={onSaveBackfill}
      />
    </>
  )
}
