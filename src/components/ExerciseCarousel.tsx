import { useRef, useState } from 'react'
import type { Exercise, ExerciseLog, SetLog, WorkoutType } from '../types/workout'
import { ExerciseCard } from './ExerciseCard'
import { SkipExerciseDialog } from './SkipExerciseDialog'

interface ExerciseCarouselProps {
  workout: WorkoutType
  exercises: Exercise[]
  currentIndex: number
  getExerciseLog: (exerciseId: string) => ExerciseLog | undefined
  onUpdateSet: (
    exerciseId: string,
    setNumber: number,
    updates: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  onPrefillSets: (exerciseId: string, weight: string, reps: string) => void
  onCompleteSet: (exerciseId: string, setNumber: number) => void
  onAddSet: (exerciseId: string) => void
  onDeleteSet: (exerciseId: string, setNumber: number) => void
  onSkipExercise: (exerciseId: string) => void
  onRemoveExercise: (exerciseId: string) => void
  onReorderExercises: (newOrder: string[]) => void
  onJumpToExercise: (index: number) => void
  isExerciseLogged: (exerciseId: string) => boolean
  isExerciseSkipped: (exerciseId: string) => boolean
  onPrevious: () => void
  onNext: () => void
  onBack: () => void
  onFinish: () => void
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

export function ExerciseCarousel({
  workout,
  exercises,
  currentIndex,
  getExerciseLog,
  onUpdateSet,
  onPrefillSets,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
  onSkipExercise,
  onRemoveExercise,
  onReorderExercises,
  onJumpToExercise,
  isExerciseLogged,
  isExerciseSkipped,
  onPrevious,
  onNext,
  onBack,
  onFinish,
}: ExerciseCarouselProps) {
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState(false)
  const dragIndex = useRef<number | null>(null)

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDrop = (dropIndex: number) => {
    const from = dragIndex.current
    if (from === null || from === dropIndex) return
    const newOrder = exercises.map((e) => e.id)
    const [moved] = newOrder.splice(from, 1)
    newOrder.splice(dropIndex, 0, moved)
    onReorderExercises(newOrder)
    dragIndex.current = null
  }

  const exercise = exercises[currentIndex]
  const exerciseLog = exercise ? getExerciseLog(exercise.id) : undefined
  const isSkipped = exercise ? isExerciseSkipped(exercise.id) : false

  const canGoPrevious = exercises
    .slice(0, currentIndex)
    .some((item) => isExerciseLogged(item.id) || isExerciseSkipped(item.id))

  const isLast = currentIndex === exercises.length - 1
  const progressLabel = `Exercise ${currentIndex + 1} of ${exercises.length}`

  const allSetsComplete =
    !isSkipped &&
    (exerciseLog?.sets.length ?? 0) > 0 &&
    (exerciseLog?.sets.every((set) => set.completed) ?? false)

  if (!exercise) {
    return (
      <div className="px-4 py-12 text-center text-zinc-400">
        No exercises remaining.
        <button type="button" onClick={onBack} className="ml-2 text-red-400 underline">
          Go back
        </button>
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-red-500">
            {workout.title} Day
          </p>
          <h2 className="text-[28px] font-bold text-white">{progressLabel}</h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="self-start rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Back to workouts
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          {isSkipped && (
            <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
              You skipped this exercise. Log sets below to complete it, or skip again to move on.
            </div>
          )}

          <ExerciseCard
            exercise={exercise}
            exerciseLog={exerciseLog}
            workoutTitle={`${workout.title} Day`}
            exerciseIndex={currentIndex}
            totalExercises={exercises.length}
            onUpdateSet={(setNumber, updates) => onUpdateSet(exercise.id, setNumber, updates)}
            onPrefillSets={(weight, reps) => onPrefillSets(exercise.id, weight, reps)}
            onCompleteSet={(setNumber) => onCompleteSet(exercise.id, setNumber)}
            onAddSet={() => onAddSet(exercise.id)}
            onDeleteSet={(setNumber) => onDeleteSet(exercise.id, setNumber)}
          />

          {exerciseLog && (
            <div className="mt-4 px-5 sm:px-6">
              <button
                type="button"
                onClick={() => setSkipConfirmOpen(true)}
                className="w-full rounded-lg bg-zinc-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-500"
              >
                {isSkipped ? 'Skip again' : 'Skip exercise'}
              </button>
            </div>
          )}

          <SkipExerciseDialog
            open={skipConfirmOpen}
            exerciseName={exercise.name}
            isLastExercise={isLast}
            onConfirm={() => {
              setSkipConfirmOpen(false)
              onSkipExercise(exercise.id)
            }}
            onCancel={() => setSkipConfirmOpen(false)}
          />

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className="rounded-xl border border-zinc-700 px-4 py-4 text-base font-semibold text-zinc-200 transition enabled:hover:border-zinc-500 enabled:hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={onFinish}
                disabled={!allSetsComplete}
                className="rounded-xl bg-green-600 px-4 py-4 text-base font-semibold text-white transition enabled:hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Finish workout
              </button>
            ) : (
              <button
                type="button"
                onClick={onNext}
                disabled={!allSetsComplete}
                className="rounded-xl bg-red-600 px-4 py-4 text-base font-semibold text-white transition enabled:hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next exercise
              </button>
            )}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-44 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Workout overview
              </h3>
              <button
                type="button"
                onClick={() => setEditingOrder((v) => !v)}
                className="text-xs font-semibold text-zinc-400 transition hover:text-zinc-200"
              >
                {editingOrder ? 'Done' : 'Edit'}
              </button>
            </div>
            <ol className="space-y-1">
              {exercises.map((item: Exercise, index: number) => {
                const isActive = index === currentIndex
                const logged = isExerciseLogged(item.id)
                const skipped = isExerciseSkipped(item.id)
                const log = getExerciseLog(item.id)
                const loggedSets = log?.sets.filter((set) => set.completed).length ?? 0
                const totalSets = log?.sets.length ?? 0

                return (
                  <li
                    key={item.id}
                    draggable={editingOrder}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className="flex items-center gap-1"
                  >
                    {editingOrder && (
                      <span className="cursor-grab text-zinc-500 active:cursor-grabbing">
                        <DragHandle />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => !editingOrder && onJumpToExercise(index)}
                      className={`flex-1 rounded-lg px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? 'bg-red-500/15 font-semibold text-red-300'
                          : skipped
                            ? 'text-yellow-500/80 hover:bg-zinc-800'
                            : logged
                              ? 'text-zinc-400 hover:bg-zinc-800'
                              : 'text-zinc-600 hover:bg-zinc-800'
                      } ${editingOrder ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          {index + 1}. {item.name}
                        </span>
                        <span className="shrink-0 text-xs text-zinc-500">
                          {skipped ? 'Skipped' : logged ? `${loggedSets}/${totalSets}` : ''}
                        </span>
                      </div>
                    </button>
                    {editingOrder && (
                      <button
                        type="button"
                        onClick={() => onRemoveExercise(item.id)}
                        className="px-1.5 text-zinc-600 transition hover:text-red-400"
                        aria-label={`Remove ${item.name}`}
                      >
                        ×
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        </aside>
      </div>
    </section>
  )
}
