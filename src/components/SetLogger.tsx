import { useState } from 'react'
import type { CoachingMode } from '../data/exerciseCatalog'
import type { SetLog } from '../types/workout'
import {
  getSetFeedback,
  getNextSessionCard,
  type ProgressionRecommendation,
} from '../services/sessionCoaching'
import { sanitizeRepsInput } from '../utils/weightInput'

interface SetLoggerProps {
  sets: SetLog[]
  coachingMode: CoachingMode
  recommendation: ProgressionRecommendation
  targetWeight: string | null
  repRangeLabel: string
  onUpdateSet: (setNumber: number, updates: Partial<Pick<SetLog, 'weight' | 'reps'>>) => void
  onCompleteSet: (setNumber: number) => void
  onAddSet: () => void
  onDeleteSet: (setNumber: number) => void
}

function weightDisplayValue(
  set: SetLog,
  targetWeight: string | null,
  coachingMode: CoachingMode,
): string {
  if (coachingMode === 'bodyweight_reps') return 'BW'
  if (coachingMode === 'time') return '—'
  if (set.weight) return set.weight
  return targetWeight ?? ''
}

export function SetLogger({
  sets,
  coachingMode,
  recommendation,
  targetWeight,
  repRangeLabel,
  onUpdateSet,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
}: SetLoggerProps) {
  const [nextSessionWeightOverride, setNextSessionWeightOverride] = useState<string | null>(null)
  const [editingSetNumber, setEditingSetNumber] = useState<number | null>(null)

  const currentSetNumber =
    sets.find((set) => !set.completed)?.setNumber ?? sets[sets.length - 1]?.setNumber ?? 1
  const canDelete = sets.length > 1
  const isTime = coachingMode === 'time'
  const isWeighted = coachingMode === 'weighted'
  const totalSets = sets.length
  const allCompleted = sets.every((s) => s.completed)

  const completedReps = sets
    .filter((s) => s.completed)
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((s) => parseInt(s.reps, 10) || 0)

  const handleComplete = (setNumber: number) => {
    const set = sets.find((item) => item.setNumber === setNumber)
    if (!set) return

    if (isWeighted && targetWeight && !set.weight) {
      onUpdateSet(setNumber, { weight: targetWeight })
    }
    if (coachingMode === 'bodyweight_reps' && !set.weight) {
      onUpdateSet(setNumber, { weight: 'BW' })
    }

    onCompleteSet(setNumber)
  }

  const nextSessionCard = allCompleted ? getNextSessionCard(recommendation) : null
  const nextSessionWeight =
    nextSessionWeightOverride ?? String(nextSessionCard?.suggestedWeightLbs ?? '')

  return (
    <div className="px-5 py-5 sm:px-6">
      {/* Table header */}
      <div
        className="mb-2 grid gap-2 border-b pb-1.5"
        style={{
          gridTemplateColumns: '24px 90px 80px 90px 80px 1fr',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        {['#', 'Weight', 'Target reps', isTime ? 'Done' : 'Reps done', 'Action', ''].map((label) => (
          <span
            key={label}
            className="text-[10px] uppercase tracking-[0.06em]"
            style={{ color: 'rgba(255,255,255,0.22)' }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Set rows */}
      <div className="space-y-0">
        {sets.map((set) => {
          const isCompleted = set.completed
          const isCurrent = !isCompleted && set.setNumber === currentSetNumber
          const isFuture = !isCompleted && set.setNumber > currentSetNumber

          const completedRepsUpToNow = isCompleted
            ? sets
                .filter((s) => s.completed && s.setNumber <= set.setNumber)
                .sort((a, b) => a.setNumber - b.setNumber)
                .map((s) => parseInt(s.reps, 10) || 0)
            : []

          const feedback =
            isCompleted && !isTime
              ? getSetFeedback(
                  set.setNumber,
                  completedRepsUpToNow,
                  recommendation.repFloor,
                  recommendation.repCeiling,
                  totalSets,
                )
              : null

          const weightValue = weightDisplayValue(set, targetWeight, coachingMode)
          const isWeightEditable = isWeighted && !isFuture
          const isBeingEdited = isCompleted && editingSetNumber === set.setNumber

          const inputStyle = () => {
            if (isCompleted && isBeingEdited) return {
              background: 'rgba(239,68,68,0.05)',
              border: '0.5px solid rgba(239,68,68,0.35)',
              color: '#fff',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: 15,
              width: '100%',
              textAlign: 'center' as const,
            }
            if (isCompleted) return {
              background: 'rgba(255,255,255,0.07)',
              border: '0.5px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.8)',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: 15,
              width: '100%',
              textAlign: 'center' as const,
            }
            if (isCurrent) return {
              background: 'rgba(239,68,68,0.05)',
              border: '0.5px solid rgba(239,68,68,0.35)',
              color: '#fff',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: 15,
              width: '100%',
              textAlign: 'center' as const,
            }
            // locked
            return {
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.2)',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: 15,
              width: '100%',
              textAlign: 'center' as const,
              opacity: 0.4,
              pointerEvents: 'none' as const,
            }
          }

          return (
            <div key={set.setNumber}>
              <div
                className="grid items-center gap-2 py-3"
                style={{
                  gridTemplateColumns: '24px 90px 80px 90px 80px 1fr',
                  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                }}
              >
                {/* Set number */}
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {set.setNumber}
                </span>

                {/* Weight input */}
                {isWeightEditable ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={weightValue}
                    disabled={isFuture}
                    readOnly={isCompleted && !isBeingEdited}
                    onChange={(e) => onUpdateSet(set.setNumber, { weight: e.target.value })}
                    style={inputStyle()}
                  />
                ) : (
                  <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.28)', textAlign: 'center' }}>
                    {weightValue}
                  </span>
                )}

                {/* Target reps (read-only) */}
                <span
                  className="text-[12px]"
                  style={{ color: 'rgba(255,255,255,0.28)', textAlign: 'center' }}
                >
                  {isTime ? 'Time' : repRangeLabel}
                </span>

                {/* Reps done input */}
                <input
                  type="text"
                  inputMode="numeric"
                  value={set.reps}
                  disabled={isFuture}
                  readOnly={isCompleted && !isBeingEdited}
                  onChange={(event) =>
                    onUpdateSet(set.setNumber, { reps: sanitizeRepsInput(event.target.value) })
                  }
                  placeholder={isTime ? 'sec' : '0'}
                  style={inputStyle()}
                />

                {/* Action button */}
                {isCompleted ? (
                  <button
                    type="button"
                    onClick={() =>
                      setEditingSetNumber(isBeingEdited ? null : set.setNumber)
                    }
                    style={
                      isBeingEdited
                        ? {
                            background: 'rgba(239,68,68,0.08)',
                            border: '0.5px solid rgba(239,68,68,0.35)',
                            borderRadius: 6,
                            padding: '9px 0',
                            color: '#ef4444',
                            fontSize: 11,
                            fontWeight: 600,
                            width: 80,
                            flexShrink: 0,
                            cursor: 'pointer',
                          }
                        : {
                            background: 'transparent',
                            border: '0.5px solid rgba(255,255,255,0.15)',
                            borderRadius: 6,
                            padding: '9px 0',
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: 11,
                            width: 80,
                            flexShrink: 0,
                            cursor: 'pointer',
                          }
                    }
                  >
                    {isBeingEdited ? '✓ Done' : '✓ Edit'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isFuture}
                    onClick={() => handleComplete(set.setNumber)}
                    style={
                      isFuture
                        ? {
                            background: 'transparent',
                            border: '0.5px solid rgba(255,255,255,0.06)',
                            borderRadius: 6,
                            padding: '9px 0',
                            color: 'rgba(255,255,255,0.15)',
                            fontSize: 11,
                            width: 80,
                            flexShrink: 0,
                            opacity: 0.4,
                            cursor: 'default',
                          }
                        : {
                            background: '#ef4444',
                            border: 'none',
                            borderRadius: 6,
                            padding: '9px 0',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                            width: 80,
                            flexShrink: 0,
                            cursor: 'pointer',
                          }
                    }
                  >
                    Complete
                  </button>
                )}

                {/* Inline feedback — sits to the right of the action button in the last 1fr column */}
                {feedback && (
                  <span
                    className="inline-block rounded-md px-2.5 py-1 text-[11px]"
                    style={
                      feedback.tone === 'amber'
                        ? {
                            background: 'rgba(251,191,36,0.07)',
                            border: '0.5px solid rgba(251,191,36,0.2)',
                            color: '#fbbf24',
                          }
                        : {
                            background: 'rgba(16,185,129,0.08)',
                            border: '0.5px solid rgba(16,185,129,0.2)',
                            color: '#34d399',
                          }
                    }
                  >
                    {feedback.message}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Next session card */}
      {nextSessionCard && (
        <div
          className="mt-4 rounded-lg px-4 py-3.5"
          style={
            recommendation.case === 1
              ? { background: 'rgba(16,185,129,0.07)', border: '0.5px solid rgba(16,185,129,0.2)' }
              : { background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }
          }
        >
          <p
            className="mb-1 text-[10px] uppercase tracking-[0.08em]"
            style={{ color: recommendation.case === 1 ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.2)' }}
          >
            Next session
          </p>
          <p
            className="mb-0.5 text-[14px] font-semibold"
            style={{ color: recommendation.case === 1 ? '#34d399' : 'rgba(255,255,255,0.6)' }}
          >
            {nextSessionCard.title}
          </p>
          <p className="mb-2 text-[11px] leading-[1.5]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {nextSessionCard.body}
          </p>
          {nextSessionCard.suggestedWeightLbs !== null && (
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="decimal"
                value={nextSessionWeight}
                onChange={(e) => setNextSessionWeightOverride(e.target.value)}
                className="text-center font-bold"
                style={{
                  width: 70,
                  fontSize: 14,
                  background: 'rgba(255,255,255,0.08)',
                  border: recommendation.case === 1
                    ? '0.5px solid rgba(16,185,129,0.25)'
                    : '0.5px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  padding: '5px 10px',
                  color: '#fff',
                }}
              />
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                × {nextSessionCard.repFloor}–{nextSessionCard.repCeiling} reps
              </span>
              <span className="ml-auto text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
                edit to override
              </span>
            </div>
          )}
        </div>
      )}

      {/* Row actions */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAddSet}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
        >
          + Add set
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDeleteSet(sets[sets.length - 1].setNumber)}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            Remove last set
          </button>
        )}
      </div>
    </div>
  )
}
