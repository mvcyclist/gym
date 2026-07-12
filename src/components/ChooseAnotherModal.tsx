import { useEffect } from 'react'
import type { WorkoutCategory } from '../types/workout'
import type { ScoredWorkout, QualityBucket, WorkoutType } from '../types/training'

const FALLBACK_OPTIONS: Array<{ type: string; label: string }> = [
  { type: 'Full Body', label: 'Full Body — Mobility, six lifts, core' },
  { type: 'Push',     label: 'Push — Chest, shoulders, triceps' },
  { type: 'Pull',     label: 'Pull — Back, biceps, rear delts' },
  { type: 'Leg',      label: 'Leg — Quads, hamstrings, glutes' },
  { type: 'Core',     label: 'Core — Stability and anti-rotation' },
  { type: 'Run',      label: 'Run' },
  { type: 'Swim',     label: 'Swim' },
  { type: 'Bike',     label: 'Bike' },
  { type: 'Walk',     label: 'Walk' },
  { type: 'Mobility', label: 'Mobility — Movement prep & recovery' },
]

const BUCKET_DOT: Record<QualityBucket, string> = {
  Best:     'bg-emerald-400',
  Good:     'bg-sky-400',
  Marginal: 'bg-amber-400',
  Skip:     'bg-zinc-600',
}

const BUCKET_LABEL: Record<QualityBucket, string> = {
  Best:     'Best',
  Good:     'Good',
  Marginal: 'Marginal',
  Skip:     'Skip',
}

interface ChooseAnotherModalProps {
  open: boolean
  alternatives: ScoredWorkout[]
  onClose: () => void
  onSelectWorkout: (id: WorkoutCategory) => void
  onSelectCardio: (type: WorkoutType) => void
  onSelectCore: () => void
  onSelectMobility: () => void
  onSelectTimer: () => void
}

const CARDIO_TYPES = new Set(['Swim', 'Run', 'Bike', 'Walk'])

function typeToAction(
  type: string,
  onSelectWorkout: (id: WorkoutCategory) => void,
  onSelectCardio: (type: WorkoutType) => void,
  onSelectCore: () => void,
  onSelectMobility: () => void,
) {
  switch (type) {
    case 'Full Body': return () => onSelectWorkout('full_body')
    case 'Push': return () => onSelectWorkout('push')
    case 'Pull': return () => onSelectWorkout('pull')
    case 'Leg':  return () => onSelectWorkout('leg')
    case 'Core': return onSelectCore
    default:
      if (CARDIO_TYPES.has(type)) return () => onSelectCardio(type as WorkoutType)
      return () => onSelectMobility()
  }
}

export function ChooseAnotherModal({
  open,
  alternatives,
  onClose,
  onSelectWorkout,
  onSelectCardio,
  onSelectCore,
  onSelectMobility,
  onSelectTimer,
}: ChooseAnotherModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const alternativesWithoutFullBody = alternatives.filter((item) => item.type !== 'Full Body')
  const hasAlternatives = alternativesWithoutFullBody.length > 0
  const goodOptions = alternativesWithoutFullBody.filter((a) => a.bucket === 'Best' || a.bucket === 'Good')
  const marginalOptions = alternativesWithoutFullBody.filter((a) => a.bucket === 'Marginal')
  const skipOptions = alternativesWithoutFullBody.filter((a) => a.bucket === 'Skip')

  const startFullBody = () => {
    onSelectWorkout('full_body')
    onClose()
  }

  const renderRow = (item: ScoredWorkout) => {
    const action = typeToAction(item.type, onSelectWorkout, onSelectCardio, onSelectCore, onSelectMobility)
    const isSkip = item.bucket === 'Skip'

    return (
      <button
        key={item.type}
        type="button"
        onClick={() => { action(); onClose() }}
        disabled={isSkip}
        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition
          ${isSkip
            ? 'border-zinc-800 bg-zinc-900/40 opacity-50 cursor-not-allowed'
            : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800'
          }`}
      >
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${BUCKET_DOT[item.bucket]}`} aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white text-sm">{item.type}</span>
            <span className={`text-[10px] font-medium uppercase tracking-wider shrink-0
              ${item.bucket === 'Best' ? 'text-emerald-400'
              : item.bucket === 'Good' ? 'text-sky-400'
              : item.bucket === 'Marginal' ? 'text-amber-400'
              : 'text-zinc-500'}`}
            >
              {BUCKET_LABEL[item.bucket]}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{item.reason}</p>
        </div>
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 sm:rounded-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Choose a workout
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 transition hover:text-zinc-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Full body
            </p>
            <button
              type="button"
              onClick={startFullBody}
              className="flex w-full items-center rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm font-semibold text-red-200 transition hover:border-red-500/50 hover:bg-red-500/15"
            >
              Full Body — Warm-up, six lifts, core, mobility
            </button>
          </div>

          {hasAlternatives ? (
            <>
              {goodOptions.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Good ideas</p>
                  <div className="flex flex-col gap-2">{goodOptions.map(renderRow)}</div>
                </div>
              )}
              {marginalOptions.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-500/70">Will work, quality may suffer</p>
                  <div className="flex flex-col gap-2">{marginalOptions.map(renderRow)}</div>
                </div>
              )}
              {skipOptions.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-500/70">Not recommended</p>
                  <div className="flex flex-col gap-2">{skipOptions.map(renderRow)}</div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="flex flex-col gap-2">
                {FALLBACK_OPTIONS.filter(({ type }) => type !== 'Full Body').map(({ type, label }) => {
                  const action = typeToAction(type, onSelectWorkout, onSelectCardio, onSelectCore, onSelectMobility)
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { action(); onClose() }}
                      className="flex w-full items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-zinc-600 hover:bg-zinc-800"
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Other</p>
            <button
              type="button"
              onClick={() => { onSelectTimer(); onClose() }}
              className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-left transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <span className="font-semibold text-white text-sm">Timer only</span>
              <span className="text-xs text-zinc-500">No logging, just the clock</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
