import { useCallback, useRef, useState } from 'react'
import { WeeklyPlanView } from './WeeklyPlanView'
import { mobilityExercises } from '../data/mobility'
import { workouts } from '../data/workouts'
import type { WorkoutCategory } from '../types/workout'
import type { ActivityEntry, DayActivity, WorkoutRecommendation } from '../types/training'
import { ActivityHistoryStrip } from './ActivityHistoryStrip'
import { ActionCard } from './ActionCard'
import { BackfillRecentActivityModal } from './BackfillRecentActivityModal'
import { EditActivityModal } from './EditActivityModal'
import { GettingStartedCard } from './GettingStartedCard'
import { PostWorkoutInsights } from './PostWorkoutInsights'
import { TodayRecommendationCard } from './TodayRecommendationCard'
import { WorkoutCard } from './WorkoutCard'
import type { TodaySummary } from '../utils/workoutSummary'

interface WorkoutSelectorProps {
  activityHistory: DayActivity[]
  activeDaysCount: number
  recommendationReady: boolean
  recommendation: WorkoutRecommendation | null
  todayLogged: boolean
  todaySummary: TodaySummary | null
  tomorrowRecommendation: WorkoutRecommendation | null
  weeklyPlan: import('../services/recommendationService').WeeklyPlanDay[]
  onUpdateDayActivities: (date: string, activities: ActivityEntry[]) => void
  onDeleteWorkoutSession: (sessionId: string) => void
  onSaveBackfill: (rows: import('./BackfillRecentActivityModal').BackfillRow[]) => void
  onStartRecommendation: () => void
  onStartTomorrowRecommendation: () => void
  onSelectWorkout: (workoutId: WorkoutCategory) => void
  onSelectTimer: () => void
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
  onStartTomorrowRecommendation,
  onSelectWorkout,
  onSelectTimer,
  onSelectMobility,
}: WorkoutSelectorProps) {
  const workoutSectionRef = useRef<HTMLDivElement>(null)
  const [editingDay, setEditingDay] = useState<DayActivity | null>(null)
  const [backfillOpen, setBackfillOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)

  const strengthWorkouts = workouts.filter((workout) =>
    ['push', 'pull', 'leg', 'core'].includes(workout.id),
  )

  const handleDeleteWorkoutSession = useCallback(
    (sessionId: string) => {
      onDeleteWorkoutSession(sessionId)
      setEditingDay((current) => {
        if (!current) return null
        return {
          ...current,
          activities: current.activities.filter((activity) => activity.sessionId !== sessionId),
        }
      })
    },
    [onDeleteWorkoutSession],
  )

  const scrollToWorkouts = () => {
    workoutSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What do you want to work on today?
          </h1>
          <p className="mt-3 text-base text-zinc-400 sm:text-lg">
            Choose a workout, start a timer, or do mobility work.
          </p>
        </div>

        <div className="mb-8">
          {todayLogged && todaySummary && tomorrowRecommendation ? (
            <PostWorkoutInsights
              todaySummary={todaySummary}
              tomorrowRecommendation={tomorrowRecommendation}
              onStartTomorrow={onStartTomorrowRecommendation}
            />
          ) : recommendationReady && recommendation ? (
            <TodayRecommendationCard
              recommendation={recommendation}
              onStart={onStartRecommendation}
              onChooseAnother={scrollToWorkouts}
            />
          ) : (
            <GettingStartedCard
              activeDaysCount={activeDaysCount}
              onStartWorkout={scrollToWorkouts}
              onLogRecentDays={() => setBackfillOpen(true)}
            />
          )}
        </div>

        {recommendationReady && weeklyPlan.length > 0 && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setPlanOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-zinc-200"
            >
              <span>{planOpen ? '▾' : '▸'}</span>
              {planOpen ? 'Hide' : 'See'} this week's plan
            </button>
            {planOpen && <WeeklyPlanView plan={weeklyPlan} />}
          </div>
        )}

        <div className="mb-10">
          <ActivityHistoryStrip
            days={activityHistory}
            emptyHint="No activity yet — complete a workout or log recent days."
            onEditDay={(day) => setEditingDay(day)}
          />
        </div>

        <div ref={workoutSectionRef} className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Workouts</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {strengthWorkouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} onSelect={onSelectWorkout} />
          ))}
        </div>

        <div className="mb-4 mt-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">More</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard
            title="Mobility"
            description="Stretching, warm-ups, recovery, and movement prep."
            meta={`${mobilityExercises.length} moves`}
            onClick={onSelectMobility}
          />
          <ActionCard
            title="Timer Only"
            description="Use the rest timer without logging a workout."
            onClick={onSelectTimer}
          />
        </div>
      </section>

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
