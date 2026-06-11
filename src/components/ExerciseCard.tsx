import type { Exercise, ExerciseLog, SetLog } from '../types/workout'
import { SetLogger } from './SetLogger'

interface ExerciseCardProps {
  exercise: Exercise
  exerciseLog?: ExerciseLog
  onUpdateSet: (setNumber: number, updates: Partial<Pick<SetLog, 'weight' | 'reps'>>) => void
  onCompleteSet: (setNumber: number) => void
  onAddSet: () => void
  onDeleteSet: (setNumber: number) => void
}

export function ExerciseCard({
  exercise,
  exerciseLog,
  onUpdateSet,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
}: ExerciseCardProps) {
  const sets = exerciseLog?.sets ?? []

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90">
      <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
        <h3 className="text-2xl font-bold text-white sm:text-3xl">{exercise.name}</h3>
      </div>

      {exerciseLog && (
        <SetLogger
          sets={sets}
          targetReps={exercise.reps}
          onUpdateSet={onUpdateSet}
          onCompleteSet={onCompleteSet}
          onAddSet={onAddSet}
          onDeleteSet={onDeleteSet}
        />
      )}
    </article>
  )
}
