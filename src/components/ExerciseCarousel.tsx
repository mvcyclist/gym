import type { Exercise, ExerciseLog, SetLog, WorkoutType } from '../types/workout'
import { ExerciseCard } from './ExerciseCard'

interface ExerciseCarouselProps {
  workout: WorkoutType
  currentIndex: number
  getExerciseLog: (exerciseId: string) => ExerciseLog | undefined
  onUpdateSet: (
    exerciseId: string,
    setNumber: number,
    updates: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  onCompleteSet: (exerciseId: string, setNumber: number) => void
  onAddSet: (exerciseId: string) => void
  onDeleteSet: (exerciseId: string, setNumber: number) => void
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
  onCompleteSet,
  onAddSet,
  onDeleteSet,
  onPrevious,
  onNext,
  onBack,
  onFinish,
}: ExerciseCarouselProps) {
  const exercise = workout.exercises[currentIndex]
  const exerciseLog = getExerciseLog(exercise.id)
  const isFirst = currentIndex === 0
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
            onUpdateSet={(setNumber, updates) => onUpdateSet(exercise.id, setNumber, updates)}
            onCompleteSet={(setNumber) => onCompleteSet(exercise.id, setNumber)}
            onAddSet={() => onAddSet(exercise.id)}
            onDeleteSet={(setNumber) => onDeleteSet(exercise.id, setNumber)}
          />

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onPrevious}
              disabled={isFirst}
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
                const log = getExerciseLog(item.id)
                const loggedSets = log?.sets.filter((set) => set.completed).length ?? 0
                const totalSets = log?.sets.length ?? 3

                return (
                  <li
                    key={item.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      isActive
                        ? 'bg-red-500/15 font-semibold text-red-300'
                        : 'text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        {index + 1}. {item.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {loggedSets}/{totalSets}
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
