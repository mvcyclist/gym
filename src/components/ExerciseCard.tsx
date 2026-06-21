import { useEffect, useMemo, useState } from 'react'
import type { Exercise, ExerciseLog, SetLog } from '../types/workout'
import { SetLogger } from './SetLogger'
import {
  getProgressionTarget,
  getProfileForCatalogId,
  checkPR,
} from '../services/progressiveOverloadEngine'
import { getExerciseHistoryForProgression } from '../services/exerciseHistoryService'

const SUBLABEL_COLOR: Record<string, string> = {
  PROGRESS: '#4ade80',
  ACCUMULATE: '#86efac',
  CONSOLIDATE: '#888',
  DELOAD: '#f87171',
  FIRST: '#555',
}

interface ExerciseCardProps {
  exercise: Exercise
  exerciseLog?: ExerciseLog
  onUpdateSet: (setNumber: number, updates: Partial<Pick<SetLog, 'weight' | 'reps'>>) => void
  onPrefillSets: (weight: string, reps: string) => void
  onCompleteSet: (setNumber: number) => void
  onAddSet: () => void
  onDeleteSet: (setNumber: number) => void
}

export function ExerciseCard({
  exercise,
  exerciseLog,
  onUpdateSet,
  onPrefillSets,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
}: ExerciseCardProps) {
  const sets = exerciseLog?.sets ?? []
  const [prBanner, setPrBanner] = useState(false)

  const { target, profile } = useMemo(() => {
    const p = getProfileForCatalogId(exercise.catalogExerciseId, exercise.name, {
      sets: exercise.sets,
      reps: exercise.reps,
    })
    const history = getExerciseHistoryForProgression(
      exercise.catalogExerciseId,
      p.repRangeBottom,
      p.repRangeTop,
    )
    return { target: getProgressionTarget(history, p), profile: p }
  }, [exercise.catalogExerciseId, exercise.name, exercise.reps, exercise.sets])

  // Prefill all empty sets at once when exercise loads
  useEffect(() => {
    if (!exerciseLog || target.targetWeight <= 0) return
    onPrefillSets(String(target.targetWeight), String(target.targetRepsBottom))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.catalogExerciseId])

  const handleCompleteSet = (setNumber: number) => {
    onCompleteSet(setNumber)
    const set = sets.find((s) => s.setNumber === setNumber)
    if (!set) return
    const weight = parseFloat(set.weight)
    const reps = parseInt(set.reps, 10)
    if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) return
    const history = getExerciseHistoryForProgression(
      exercise.catalogExerciseId,
      profile.repRangeBottom,
      profile.repRangeTop,
    )
    if (checkPR(history, weight, reps)) setPrBanner(true)
  }

  const isDeload = target.state === 'DELOAD'

  return (
    <article
      className="overflow-hidden rounded-2xl border bg-zinc-900/90"
      style={{ borderColor: isDeload ? '#3a2010' : undefined }}
    >
      <div className="border-b border-zinc-800 px-5 py-4 sm:px-6" style={isDeload ? { borderColor: '#3a2010' } : undefined}>
        <h3 className="text-2xl font-bold text-white sm:text-3xl">{exercise.name}</h3>

        <div className="mt-2 space-y-0.5">
          <p className="text-sm text-zinc-300">{target.label}</p>
          <p className="text-xs" style={{ color: SUBLABEL_COLOR[target.state] }}>
            {target.sublabel}
          </p>
        </div>
      </div>

      {isDeload && (
        <div className="border-b px-5 py-3 sm:px-6" style={{ borderColor: '#3a2010', backgroundColor: '#1c0f08' }}>
          <p className="text-sm font-semibold" style={{ color: '#f87171' }}>
            Deload week
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Stalled {target.stallCount} sessions — drop weight, rebuild consistency.
          </p>
        </div>
      )}

      {exerciseLog && (
        <SetLogger
          sets={sets}
          targetReps={exercise.reps}
          onUpdateSet={onUpdateSet}
          onCompleteSet={handleCompleteSet}
          onAddSet={onAddSet}
          onDeleteSet={onDeleteSet}
        />
      )}

      {prBanner && (
        <div className="border-t border-zinc-800 px-5 py-3 sm:px-6" style={{ backgroundColor: '#0f2010' }}>
          <p className="text-sm font-bold" style={{ color: '#4ade80' }}>
            🏆 New PR! Estimated 1RM is your best ever for this exercise.
          </p>
        </div>
      )}
    </article>
  )
}
