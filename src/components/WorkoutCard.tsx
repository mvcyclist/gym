import type { WorkoutType } from '../types/workout'

interface WorkoutCardProps {
  workout: WorkoutType
  onSelect: (workoutId: WorkoutType['id']) => void
}

export function WorkoutCard({ workout, onSelect }: WorkoutCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(workout.id)}
      className="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 text-left transition hover:border-red-500/60 hover:bg-zinc-900"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">{workout.title}</h2>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300">
          {workout.exercises.length} exercises
        </span>
      </div>
      <p className="mb-6 flex-1 text-sm leading-relaxed text-zinc-400">{workout.description}</p>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Est. {workout.estimatedDuration}
      </p>
    </button>
  )
}
