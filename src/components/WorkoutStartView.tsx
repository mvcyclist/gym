import { useRef, useState } from 'react'
import { getWorkoutById } from '../data/workouts'
import type { Exercise, WorkoutCategory } from '../types/workout'

interface WorkoutStartViewProps {
  workoutId: WorkoutCategory
  onStart: (customOrder?: string[]) => void
  onBack: () => void
}

function DragHandle() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="2" y="3" width="12" height="2" rx="1" />
      <rect x="2" y="7" width="12" height="2" rx="1" />
      <rect x="2" y="11" width="12" height="2" rx="1" />
    </svg>
  )
}

export function WorkoutStartView({ workoutId, onStart, onBack }: WorkoutStartViewProps) {
  const workout = getWorkoutById(workoutId)
  const [exercises, setExercises] = useState<Exercise[]>(() => workout?.exercises ?? [])
  const [editingOrder, setEditingOrder] = useState(false)
  const dragIndex = useRef<number | null>(null)

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

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDrop = (dropIndex: number) => {
    const from = dragIndex.current
    if (from === null || from === dropIndex) return
    setExercises((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(dropIndex, 0, moved)
      return next
    })
    dragIndex.current = null
  }

  const isCustomized =
    exercises.length !== workout.exercises.length ||
    exercises.some((e, i) => e.id !== workout.exercises[i]?.id)

  const handleStart = () => {
    onStart(isCustomized ? exercises.map((e) => e.id) : undefined)
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
          Est. {workout.estimatedDuration} · {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </p>

        <div className="mt-6 border-t border-zinc-800 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Exercises
            </h3>
            <button
              type="button"
              onClick={() => setEditingOrder((v) => !v)}
              className="text-xs font-semibold text-zinc-400 transition hover:text-zinc-200"
            >
              {editingOrder ? 'Done' : 'Edit'}
            </button>
          </div>

          {exercises.length === 0 && (
            <p className="text-sm text-zinc-500">No exercises selected.</p>
          )}

          <ol className="space-y-2">
            {exercises.map((exercise, index) => (
              <li
                key={exercise.id}
                draggable={editingOrder}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                className="flex items-center gap-2"
              >
                {editingOrder && (
                  <span className="cursor-grab text-zinc-500 active:cursor-grabbing">
                    <DragHandle />
                  </span>
                )}
                <div className="flex flex-1 items-center justify-between gap-3 rounded-lg bg-zinc-950/60 px-4 py-3 text-sm">
                  <span className="text-zinc-200">
                    {index + 1}. {exercise.name}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {exercise.sets} × {exercise.reps}
                  </span>
                </div>
                {editingOrder && (
                  <button
                    type="button"
                    onClick={() => removeExercise(exercise.id)}
                    className="px-1.5 text-zinc-600 transition hover:text-red-400"
                    aria-label={`Remove ${exercise.name}`}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={exercises.length === 0}
          className="mt-8 w-full rounded-xl bg-red-600 px-4 py-4 text-base font-semibold text-white transition enabled:hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start workout
        </button>
      </div>
    </section>
  )
}
