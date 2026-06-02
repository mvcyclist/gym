import { mobilityExercises } from '../data/mobility'
import { workouts } from '../data/workouts'
import type { WorkoutCategory } from '../types/workout'
import { ActionCard } from './ActionCard'
import { WorkoutCard } from './WorkoutCard'

interface WorkoutSelectorProps {
  onSelectWorkout: (workoutId: WorkoutCategory) => void
  onSelectTimer: () => void
  onSelectMobility: () => void
}

export function WorkoutSelector({
  onSelectWorkout,
  onSelectTimer,
  onSelectMobility,
}: WorkoutSelectorProps) {
  const strengthWorkouts = workouts.filter((workout) =>
    ['push', 'pull', 'leg', 'core'].includes(workout.id),
  )

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          What do you want to work on today?
        </h1>
        <p className="mt-3 text-base text-zinc-400 sm:text-lg">
          Choose a workout, start a timer, or do mobility work.
        </p>
      </div>

      <div className="mb-4">
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
  )
}
