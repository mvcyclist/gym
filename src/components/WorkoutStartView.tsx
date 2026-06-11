import { getWorkoutById } from '../data/workouts'
import type { WorkoutCategory } from '../types/workout'

interface WorkoutStartViewProps {
  workoutId: WorkoutCategory
  onStart: () => void
  onBack: () => void
}

export function WorkoutStartView({ workoutId, onStart, onBack }: WorkoutStartViewProps) {
  const workout = getWorkoutById(workoutId)

  if (!workout) {
    return (
      <div className="px-4 py-12 text-center text-zinc-400">
        Workout not found.
        <button type="button" onClick={onBack} className="ml-2 text-red-400 underline">
          Go back
        </button>
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
      >
        Back to workouts
      </button>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-red-500">
          {workout.title} Day
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{workout.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{workout.description}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Est. {workout.estimatedDuration} · {workout.exercises.length} exercises
        </p>

        <ol className="mt-6 space-y-2 border-t border-zinc-800 pt-6">
          {workout.exercises.map((exercise, index) => (
            <li
              key={exercise.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-zinc-950/60 px-4 py-3 text-sm"
            >
              <span className="text-zinc-200">
                {index + 1}. {exercise.name}
              </span>
              <span className="shrink-0 text-xs text-zinc-500">
                {exercise.sets} × {exercise.reps}
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onStart}
          className="mt-8 w-full rounded-xl bg-red-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-red-500"
        >
          Start workout
        </button>
      </div>
    </section>
  )
}
