import { useEffect, useMemo, useState } from 'react'
import type { Exercise, ExerciseLog, SetLog } from '../types/workout'
import {
  getCatalogExerciseById,
  parseTemplateSetCount,
} from '../data/exerciseCatalog'
import { getLastExercisePerformance } from '../services/exerciseHistoryService'
import {
  getProgressionRecommendation,
} from '../services/sessionCoaching'
import { formatLastWorkoutMeta } from '../utils/activityHistory'
import { SetLogger } from './SetLogger'

interface ExerciseCardProps {
  exercise: Exercise
  exerciseLog?: ExerciseLog
  workoutTitle: string
  exerciseIndex: number
  totalExercises: number
  onUpdateSet: (setNumber: number, updates: Partial<Pick<SetLog, 'weight' | 'reps'>>) => void
  onPrefillSets: (weight: string, reps: string) => void
  onCompleteSet: (setNumber: number, updates?: Partial<Pick<SetLog, 'weight' | 'reps'>>) => void
  onAddSet: () => void
  onDeleteSet: (setNumber: number) => void
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

  const lastPerformance = useMemo(
    () => getLastExercisePerformance(exercise.catalogExerciseId),
    [exercise.catalogExerciseId],
  )

  const recommendation = useMemo(() => {
    if (!catalog) return null
    return getProgressionRecommendation(catalog, lastPerformance, targetSetCount)
  }, [catalog, lastPerformance, targetSetCount])

  useEffect(() => {
    if (!lastPerformance) return
    console.debug('[coaching] history match for', exercise.catalogExerciseId, {
      matchedExerciseName: lastPerformance.exerciseName,
      lastPerformedAt: lastPerformance.lastPerformedAt,
      daysSince: lastPerformance.lastPerformedAt,
      sets: lastPerformance.sets.map((s) => `${s.weight} × ${s.reps}`),
      topSet: lastPerformance.topSet,
    })
  }, [exercise.catalogExerciseId, lastPerformance])

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

  const repRangeLabel =
    recommendation.repFloor > 0
      ? `${recommendation.repFloor}–${recommendation.repCeiling}`
      : '—'

  const showSuggestedWeight =
    coachingMode === 'weighted' &&
    recommendation.case !== 5 &&
    recommendation.suggestedWeightLbs !== null

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90">
      <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
        <p
          className="mb-1 text-[12px] uppercase tracking-[0.06em]"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {workoutTitle} · Exercise {exerciseIndex + 1} of {totalExercises}
        </p>
        <h3 className="mb-2 text-[22px] font-bold text-white">{exercise.name}</h3>

        {/* Coaching strip — red left border (Option B) */}
        <div
          style={
            recommendation.case === 5
              ? {
                  background: 'rgba(255,255,255,0.03)',
                  border: '0.5px solid rgba(255,255,255,0.07)',
                  borderLeft: '3px solid rgba(255,255,255,0.15)',
                  borderRadius: '0 8px 8px 0',
                  padding: '8px 12px',
                  marginBottom: '0.875rem',
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderLeft: '3px solid #ef4444',
                  borderRadius: '0 8px 8px 0',
                  padding: '8px 12px',
                  marginBottom: '0.875rem',
                }
          }
        >
          <p
            className="mb-0.5 text-[14px] font-medium"
            style={{ color: recommendation.case === 5 ? 'rgba(255,255,255,0.4)' : '#fff' }}
          >
            {recommendation.coachingMain}
          </p>
          <p className="text-[11px] leading-[1.5]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {recommendation.coachingSub}
          </p>
        </div>

        {/* Meta row: last workout (left) + suggested weight (right) */}
        {recommendation.lastWorkoutLines.length > 0 && (
          <div
            className="mt-3 flex items-start gap-8 border-b pb-3"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {/* Left: last workout */}
            <div className="min-w-0 flex-1">
              <p
                className="mb-1 text-[10px] uppercase tracking-[0.07em]"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                Last workout
                {lastPerformance?.lastPerformedAt && (
                  <span style={{ color: 'rgba(255,255,255,0.18)', marginLeft: 6 }}>
                    · {formatLastWorkoutMeta(lastPerformance.lastPerformedAt)}
                  </span>
                )}
              </p>
              <ul className="space-y-0">
                {recommendation.lastWorkoutLines.map((line, index) => (
                  <li
                    key={index}
                    className="text-[13px] leading-[1.9]"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {recommendation.displayReason}
              </p>
            </div>

            {/* Right: suggested weight input */}
            {showSuggestedWeight && (
              <div className="shrink-0 text-right">
                <p
                  className="mb-1 text-[10px] uppercase tracking-[0.07em]"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  Suggested weight
                </p>
                <input
                  type="text"
                  inputMode="decimal"
                  value={activeTargetWeight ?? ''}
                  onChange={(event) => setWeightOverride(event.target.value)}
                  className="mb-1 block text-center font-bold"
                  style={{
                    width: 90,
                    fontSize: 18,
                    background: 'rgba(255,255,255,0.08)',
                    border: '0.5px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    color: '#fff',
                  }}
                />
                <p
                  className="text-[10px]"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  edit to override
                </p>
              </div>
            )}
          </div>
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
