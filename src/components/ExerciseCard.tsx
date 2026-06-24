import { useEffect, useMemo, useState } from 'react'
import type { Exercise, ExerciseLog, SetLog } from '../types/workout'
import {
  getCatalogExerciseById,
  parseTemplateSetCount,
  type CoachingMode,
} from '../data/exerciseCatalog'
import { getLastExercisePerformance } from '../services/exerciseHistoryService'
import {
  getProgressionRecommendation,
  type ProgressionRecommendation,
} from '../services/sessionCoaching'
import { SetLogger } from './SetLogger'

interface ExerciseCardProps {
  exercise: Exercise
  exerciseLog?: ExerciseLog
  workoutTitle: string
  exerciseIndex: number
  totalExercises: number
  onUpdateSet: (setNumber: number, updates: Partial<Pick<SetLog, 'weight' | 'reps'>>) => void
  onPrefillSets: (weight: string, reps: string) => void
  onCompleteSet: (setNumber: number) => void
  onAddSet: () => void
  onDeleteSet: (setNumber: number) => void
}

function stripTone(rec: ProgressionRecommendation, mode: CoachingMode): 'green' | 'muted' {
  if (mode === 'time') return 'muted'
  if (rec.case === 5) return 'muted'
  return 'green'
}

export function ExerciseCard({
  exercise,
  exerciseLog,
  workoutTitle,
  exerciseIndex,
  totalExercises,
  onUpdateSet,
  onPrefillSets,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
}: ExerciseCardProps) {
  const catalog = getCatalogExerciseById(exercise.catalogExerciseId)
  const coachingMode = catalog?.coachingMode ?? 'weighted'
  const targetSetCount = parseTemplateSetCount(exercise.sets)

  const recommendation = useMemo(() => {
    if (!catalog) return null
    const last = getLastExercisePerformance(exercise.catalogExerciseId)
    return getProgressionRecommendation(catalog, last, targetSetCount)
  }, [catalog, exercise.catalogExerciseId, targetSetCount])

  const [weightOverride, setWeightOverride] = useState<string | null>(null)

  useEffect(() => {
    setWeightOverride(null)
  }, [exercise.catalogExerciseId])

  const activeTargetWeight = useMemo(() => {
    if (coachingMode !== 'weighted' || !recommendation?.suggestedWeightLbs) return null
    if (weightOverride !== null && weightOverride !== '') return weightOverride
    return String(recommendation.suggestedWeightLbs)
  }, [coachingMode, recommendation, weightOverride])

  useEffect(() => {
    if (!exerciseLog || !recommendation) return
    if (recommendation.case === 5 || coachingMode === 'time') return

    if (coachingMode === 'bodyweight_reps') {
      onPrefillSets('BW', '')
      return
    }

    if (activeTargetWeight) {
      onPrefillSets(activeTargetWeight, '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.catalogExerciseId, recommendation?.case, activeTargetWeight])

  if (!catalog || !recommendation) {
    return (
      <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5">
        <p className="text-zinc-400">Unknown exercise in catalog.</p>
      </article>
    )
  }

  const tone = stripTone(recommendation, coachingMode)
  const repRangeLabel =
    recommendation.repFloor > 0
      ? `${recommendation.repFloor}–${recommendation.repCeiling}`
      : '—'

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90">
      <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
        <p
          className="mb-1 text-[11px] uppercase tracking-[0.06em]"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {workoutTitle} · Exercise {exerciseIndex + 1} of {totalExercises}
        </p>
        <h3 className="mb-2 text-[22px] font-bold text-white">{exercise.name}</h3>

        <div
          className="rounded-lg px-3 py-2"
          style={
            tone === 'green'
              ? {
                  background: 'rgba(16,185,129,0.07)',
                  border: '0.5px solid rgba(16,185,129,0.18)',
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                }
          }
        >
          <p
            className="mb-0.5 text-[13px] font-medium"
            style={{ color: tone === 'green' ? '#34d399' : 'rgba(255,255,255,0.4)' }}
          >
            {recommendation.coachingMain}
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {recommendation.coachingSub}
          </p>
        </div>

        {recommendation.lastWorkoutLines.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-[0.06em] text-zinc-500">Last workout</p>
            <ul className="mt-1 space-y-0.5">
              {recommendation.lastWorkoutLines.map((line, index) => (
                <li key={index} className="text-sm text-zinc-300">
                  {line}
                </li>
              ))}
            </ul>
            {recommendation.suggestedWeightLbs !== null && coachingMode === 'weighted' && (
              <p className="mt-2 text-sm text-zinc-300">
                Suggested:{' '}
                <span className="font-semibold text-white">
                  {recommendation.suggestedWeightLbs} lbs
                </span>
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-500">{recommendation.displayReason}</p>
          </div>
        )}

        {coachingMode === 'weighted' &&
          recommendation.case !== 5 &&
          recommendation.suggestedWeightLbs !== null && (
            <label className="mt-3 block">
              <span className="text-[10px] uppercase tracking-[0.06em] text-zinc-500">
                Working weight (editable)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={activeTargetWeight ?? ''}
                onChange={(event) => setWeightOverride(event.target.value)}
                className="mt-1 w-full max-w-[140px] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </label>
          )}
      </div>

      {exerciseLog && (
        <SetLogger
          sets={exerciseLog.sets}
          coachingMode={coachingMode}
          recommendation={recommendation}
          targetWeight={activeTargetWeight}
          repRangeLabel={repRangeLabel}
          onUpdateSet={onUpdateSet}
          onCompleteSet={onCompleteSet}
          onAddSet={onAddSet}
          onDeleteSet={onDeleteSet}
        />
      )}
    </article>
  )
}
