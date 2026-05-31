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

      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Primary muscles
          </p>
          <p className="mt-1 text-sm text-zinc-200">{exercise.primaryMuscles.join(', ')}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Equipment</p>
          <p className="mt-1 text-sm text-zinc-200">{exercise.equipment}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Rest suggestion
          </p>
          <p className="mt-1 text-sm text-zinc-200">{exercise.suggestedRestSeconds}s</p>
        </div>
      </div>

      <div className="space-y-4 border-t border-zinc-800 px-5 py-5 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Instructions
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">{exercise.instructions}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Coaching cue
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">{exercise.cues}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Common mistake
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">{exercise.commonMistakes}</p>
        </div>
      </div>
    </article>
  )
}
