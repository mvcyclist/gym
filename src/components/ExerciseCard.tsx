import { useMemo } from 'react'
import type { Exercise, ExerciseLog, SetLog } from '../types/workout'
import { SetLogger } from './SetLogger'
import { getExerciseSuggestion, formatProgressionHint } from '../services/progressionService'

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

  const suggestion = useMemo(() => {
    if (!exercise.catalogExerciseId) return null
    const targetSets = parseInt(exercise.sets, 10)
    if (!targetSets) return null
    return getExerciseSuggestion(exercise.catalogExerciseId, targetSets, exercise.reps)
  }, [exercise.catalogExerciseId, exercise.sets, exercise.reps])

  const hint = suggestion ? formatProgressionHint(suggestion) : null

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90">
      <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
        <h3 className="text-2xl font-bold text-white sm:text-3xl">{exercise.name}</h3>

        {hint && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
            <span>Last: <span className="text-zinc-300">{hint.lastTime}</span></span>
            <span className="text-zinc-600">→</span>
            <span>Target: <span className="font-medium text-zinc-200">{hint.suggested}</span></span>
            {hint.noteLabel && (
              <span className="text-xs text-zinc-500">{hint.noteLabel}</span>
            )}
          </div>
        )}
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
