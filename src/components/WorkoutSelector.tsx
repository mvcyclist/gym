import { workouts } from '../data/workouts'
import type { WorkoutCategory } from '../types/workout'
import { WorkoutCard } from './WorkoutCard'

interface WorkoutSelectorProps {
  onSelect: (workoutId: WorkoutCategory) => void
}

export function WorkoutSelector({ onSelect }: WorkoutSelectorProps) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Workout Deck</h1>
        <p className="mt-2 text-lg text-zinc-400">Choose today&apos;s session</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {workouts.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} onSelect={onSelect} />
        ))}
      </div>
    </section>
  )
}
