import { useRef, useState } from 'react'
import { getManualActivitiesForDate } from '../services/trainingLedgerService'
import { mobilityExercises } from '../data/mobility'
import { workouts } from '../data/workouts'
import type { WorkoutCategory } from '../types/workout'
import type { ActivityEntry, DayActivity, WorkoutRecommendation } from '../types/training'
import { ActivityHistoryStrip } from './ActivityHistoryStrip'
import { ActionCard } from './ActionCard'
import { BackfillRecentActivityModal } from './BackfillRecentActivityModal'
import { EditActivityModal } from './EditActivityModal'
import { GettingStartedCard } from './GettingStartedCard'
import { TodayRecommendationCard } from './TodayRecommendationCard'
import { WorkoutCard } from './WorkoutCard'

interface WorkoutSelectorProps {
  activityHistory: DayActivity[]
  activeDaysCount: number
  recommendationReady: boolean
  recommendation: WorkoutRecommendation | null
  onUpdateDayActivities: (date: string, activities: ActivityEntry[]) => void
  onSaveBackfill: (rows: import('./BackfillRecentActivityModal').BackfillRow[]) => void
  onStartRecommendation: () => void
  onSelectWorkout: (workoutId: WorkoutCategory) => void
  onSelectTimer: () => void
  onSelectMobility: () => void
}

export function WorkoutSelector({
  activityHistory,
  activeDaysCount,
  recommendationReady,
  recommendation,
  onUpdateDayActivities,
  onSaveBackfill,
  onStartRecommendation,
  onSelectWorkout,
  onSelectTimer,
  onSelectMobility,
}: WorkoutSelectorProps) {
  const workoutSectionRef = useRef<HTMLDivElement>(null)
  const [editingDay, setEditingDay] = useState<DayActivity | null>(null)
  const [backfillOpen, setBackfillOpen] = useState(false)

  const strengthWorkouts = workouts.filter((workout) =>
    ['push', 'pull', 'leg', 'core'].includes(workout.id),
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
          {recommendationReady && recommendation ? (
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

        <div className="mb-10">
          <ActivityHistoryStrip
            days={activityHistory}
            emptyHint="No activity yet — complete a workout or log recent days."
            onEditDay={(day) =>
              setEditingDay({
                ...day,
                activities: getManualActivitiesForDate(day.date),
              })
            }
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
      />

      <BackfillRecentActivityModal
        open={backfillOpen}
        onClose={() => setBackfillOpen(false)}
        onSave={onSaveBackfill}
      />
    </>
  )
}
