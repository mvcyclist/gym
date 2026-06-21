import type { CoachingMode } from '../data/exerciseCatalog'
import type { SetLog } from '../types/workout'
import type { ProgressionRecommendation } from '../services/progressionRecommendation'
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

function displayTargetWeight(coachingMode: CoachingMode, targetWeight: string | null): string {
  if (coachingMode === 'bodyweight_reps') return 'BW'
  if (coachingMode === 'time') return '—'
  return targetWeight ?? '—'
}

function setFeedback(
  repsLogged: number,
  setNumber: number,
  repFloor: number,
  repCeiling: number,
): { tone: 'amber' | 'green'; message: string } | null {
  if (repsLogged > 0 && repsLogged < repFloor) {
    return {
      tone: 'amber',
      message: `${repsLogged} reps — below target. Drop weight if it happens again.`,
    }
  }
  if (repsLogged >= repCeiling && setNumber === 1) {
    return {
      tone: 'green',
      message: 'Hit the ceiling on set 1 — push for it on the next set too.',
    }
  }
  return null
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
  const currentSetNumber =
    sets.find((set) => !set.completed)?.setNumber ?? sets[sets.length - 1]?.setNumber ?? 1
  const canDelete = sets.length > 1
  const targetWeightDisplay = displayTargetWeight(coachingMode, targetWeight)
  const isTime = coachingMode === 'time'
  const repsColumnLabel = isTime ? 'Done' : 'Reps done'

  const handleComplete = (setNumber: number) => {
    const set = sets.find((item) => item.setNumber === setNumber)
    if (!set) return

    if (coachingMode === 'weighted' && targetWeight && !set.weight) {
      onUpdateSet(setNumber, { weight: targetWeight })
    }
    if (coachingMode === 'bodyweight_reps' && !set.weight) {
      onUpdateSet(setNumber, { weight: 'BW' })
    }

    onCompleteSet(setNumber)
  }

  return (
    <div className="px-5 py-5 sm:px-6">
      <div
        className="mb-2 grid gap-2 border-b pb-1.5"
        style={{
          gridTemplateColumns: '32px 1fr 1fr 1fr 90px',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        {['#', 'Target weight', 'Target reps', repsColumnLabel, 'Action'].map((label) => (
          <span
            key={label}
            className="text-[10px] uppercase tracking-[0.06em]"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="space-y-0">
        {sets.map((set) => {
          const isCompleted = set.completed
          const isCurrent = !isCompleted && set.setNumber === currentSetNumber
          const isFuture = !isCompleted && set.setNumber > currentSetNumber
          const feedback =
            isCompleted && !isTime
              ? setFeedback(
                  parseInt(set.reps, 10) || 0,
                  set.setNumber,
                  recommendation.repFloor,
                  recommendation.repCeiling,
                )
              : null

          return (
            <div key={set.setNumber}>
              <div
                className="grid items-center gap-2 py-2"
                style={{
                  gridTemplateColumns: '32px 1fr 1fr 1fr 90px',
                  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                }}
              >
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {set.setNumber}
                </span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {targetWeightDisplay}
                </span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {isTime ? 'Time' : repRangeLabel}
                </span>

                {isCompleted ? (
                  <span
                    className="rounded-md px-2.5 py-1.5 text-sm"
                    style={{
                      background: 'rgba(16,185,129,0.08)',
                      border: '0.5px solid rgba(16,185,129,0.2)',
                      color: '#34d399',
                    }}
                  >
                    {set.reps || '—'}
                  </span>
                ) : (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={set.reps}
                    disabled={isFuture}
                    onChange={(event) =>
                      onUpdateSet(set.setNumber, { reps: sanitizeRepsInput(event.target.value) })
                    }
                    placeholder={isTime ? 'sec' : '0'}
                    className="w-full rounded-md px-2.5 py-1.5 text-sm"
                    style={
                      isFuture
                        ? {
                            background: 'rgba(255,255,255,0.05)',
                            border: '0.5px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.3)',
                            opacity: 0.35,
                            pointerEvents: 'none',
                          }
                        : isCurrent
                          ? {
                              background: 'rgba(239,68,68,0.05)',
                              border: '0.5px solid rgba(239,68,68,0.4)',
                              color: '#fff',
                            }
                          : {
                              background: 'rgba(255,255,255,0.05)',
                              border: '0.5px solid rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.3)',
                            }
                    }
                  />
                )}

                {isCompleted ? (
                  <span className="block text-center text-base" style={{ color: '#34d399' }}>
                    ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isFuture}
                    onClick={() => handleComplete(set.setNumber)}
                    className="w-full rounded-md py-1.5 text-xs font-semibold"
                    style={
                      isFuture
                        ? {
                            background: 'transparent',
                            border: '0.5px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.2)',
                            opacity: 0.3,
                            cursor: 'default',
                          }
                        : {
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                          }
                    }
                  >
                    Complete
                  </button>
                )}
              </div>

              {feedback && (
                <div
                  className="mb-1.5 ml-8 rounded-md px-2.5 py-1 text-[11px]"
                  style={
                    feedback.tone === 'amber'
                      ? {
                          background: 'rgba(251,191,36,0.06)',
                          border: '0.5px solid rgba(251,191,36,0.15)',
                          color: '#fbbf24',
                        }
                      : {
                          background: 'rgba(16,185,129,0.06)',
                          border: '0.5px solid rgba(16,185,129,0.12)',
                          color: '#34d399',
                        }
                  }
                >
                  {feedback.message}
                </div>
              )}
            </div>
          )
        })}
      </div>

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
