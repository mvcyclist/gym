import { useState } from 'react'
import type { Exercise, ExerciseLog, SetLog, WorkoutType } from '../types/workout'
import { ExerciseCard } from './ExerciseCard'
import { SkipExerciseDialog } from './SkipExerciseDialog'

interface ExerciseCarouselProps {
  workout: WorkoutType
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
  isExerciseLogged: (exerciseId: string) => boolean
  onPrevious: () => void
  onNext: () => void
  onBack: () => void
  onFinish: () => void
}

export function ExerciseCarousel({
  workout,
  currentIndex,
  getExerciseLog,
  onUpdateSet,
  onPrefillSets,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
  onSkipExercise,
  isExerciseLogged,
  onPrevious,
  onNext,
  onBack,
  onFinish,
}: ExerciseCarouselProps) {
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false)
  const exercise = workout.exercises[currentIndex]
  const exerciseLog = getExerciseLog(exercise.id)
  const canGoPrevious = workout.exercises
    .slice(0, currentIndex)
    .some((item) => isExerciseLogged(item.id))
  const isLast = currentIndex === workout.exercises.length - 1
  const progressLabel = `Exercise ${currentIndex + 1} of ${workout.exercises.length}`
  const allSetsComplete = exerciseLog?.sets.every((set) => set.completed) ?? false

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-red-500">
            {workout.title} Day
          </p>
          <h2 className="text-3xl font-bold text-white">{progressLabel}</h2>
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
          <ExerciseCard
            exercise={exercise}
            exerciseLog={exerciseLog}
            workoutTitle={`${workout.title} Day`}
            exerciseIndex={currentIndex}
            totalExercises={workout.exercises.length}
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
                Skip exercise
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
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Workout overview
            </h3>
            <ol className="space-y-2">
              {workout.exercises.map((item: Exercise, index: number) => {
                const isActive = index === currentIndex
                const logged = isExerciseLogged(item.id)
                const log = getExerciseLog(item.id)
                const loggedSets = log?.sets.filter((set) => set.completed).length ?? 0
                const totalSets = log?.sets.length ?? 0

                return (
                  <li
                    key={item.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      isActive
                        ? 'bg-red-500/15 font-semibold text-red-300'
                        : logged
                          ? 'text-zinc-400'
                          : 'text-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        {index + 1}. {item.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {!logged ? 'Skipped' : `${loggedSets}/${totalSets}`}
                      </span>
                    </div>
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
