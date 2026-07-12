import { useCallback, useEffect, useRef, useState } from 'react'
import { movementDurationSeconds } from '../data/fullBodySessionPlan'
import { useAccurateTimer } from '../hooks/useAccurateTimer'
import type { GuidedSegmentDefinition } from '../types/fullBodySession'

type GuidedPhase = 'preview' | 'active'

interface GuidedSegmentViewProps {
  segment: GuidedSegmentDefinition
  movementIndex: number
  segmentStartedAt: string | null | undefined
  muted: boolean
  onMovementIndexChange: (index: number) => void
  onSegmentActiveStart: () => void
  onComplete: (durationSeconds: number, status: 'completed' | 'partial') => void
  onBack: () => void
  embedded?: boolean
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function GuidedSegmentView({
  segment,
  movementIndex,
  segmentStartedAt,
  muted,
  onMovementIndexChange,
  onSegmentActiveStart,
  onComplete,
  onBack,
  embedded = false,
}: GuidedSegmentViewProps) {
  const [phase, setPhase] = useState<GuidedPhase>(() =>
    movementIndex > 0 || segmentStartedAt ? 'active' : 'preview',
  )
  const segmentStartRef = useRef<string | null>(segmentStartedAt ?? null)
  const advanceMovementRef = useRef<() => void>(() => {})

  const movement = segment.movements[movementIndex]
  const isLastMovement = movementIndex >= segment.movements.length - 1

  const getElapsedSeconds = useCallback(() => {
    const started = segmentStartRef.current
    if (!started) return 0
    return Math.max(1, Math.round((Date.now() - new Date(started).getTime()) / 1000))
  }, [])

  const finishSegment = useCallback(() => {
    onComplete(getElapsedSeconds(), 'completed')
  }, [getElapsedSeconds, onComplete])

  const advanceMovement = useCallback(() => {
    if (isLastMovement) {
      finishSegment()
      return
    }
    onMovementIndexChange(movementIndex + 1)
  }, [finishSegment, isLastMovement, movementIndex, onMovementIndexChange])

  advanceMovementRef.current = advanceMovement

  const { remaining, startWithDuration, reset } = useAccurateTimer({
    muted,
    onComplete: () => advanceMovementRef.current(),
  })

  const beginSegment = () => {
    const now = new Date().toISOString()
    segmentStartRef.current = now
    onSegmentActiveStart()
    setPhase('active')
  }

  useEffect(() => {
    if (phase !== 'active' || !movement) return undefined

    startWithDuration(movementDurationSeconds(movement))
    return () => reset()
  }, [movement?.id, phase, movement, reset, startWithDuration])

  const handleManualAdvance = () => {
    reset()
    advanceMovement()
  }

  const handleSkipSegment = () => {
    reset()
    onComplete(getElapsedSeconds(), 'partial')
  }

  const movementCountLabel = `${segment.movements.length} movement${segment.movements.length !== 1 ? 's' : ''}`

  return (
    <section
      className={
        embedded ? 'w-full' : 'mx-auto w-full max-w-3xl px-4 py-6 sm:px-6'
      }
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-red-500">Full Body</p>
          <h2 className="text-[28px] font-bold text-white">{segment.title}</h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="self-start rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Back to workouts
        </button>
      </div>

      {phase === 'preview' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8">
          <p className="text-sm text-zinc-400">
            {movementCountLabel} · ~{segment.estimatedMinutes} min
          </p>
          <ol className="mt-6 space-y-3">
            {segment.movements.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-zinc-950/60 px-4 py-3 text-sm"
              >
                <span className="text-zinc-200">
                  {index + 1}. {item.name}
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {item.repTarget ?? `${movementDurationSeconds(item)}s`}
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={beginSegment}
            className="mt-8 w-full rounded-xl bg-red-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-red-500"
          >
            Start {segment.title.toLowerCase()}
          </button>
        </div>
      )}

      {phase === 'active' && movement && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Movement {movementIndex + 1} of {segment.movements.length}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">{movement.name}</h3>
          {movement.target && (
            <p className="mt-1 text-sm text-zinc-400">{movement.target}</p>
          )}

          <div className="mt-10 flex flex-col items-center">
            <p className="text-6xl font-bold tabular-nums text-white">
              {formatCountdown(remaining)}
            </p>
            {movement.repTarget && (
              <p className="mt-3 text-lg font-semibold text-zinc-300">{movement.repTarget}</p>
            )}
            <p className="mt-2 text-sm text-zinc-500">
              Beeps at 5s · advances automatically
            </p>
            <button
              type="button"
              onClick={handleManualAdvance}
              className="mt-8 rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              {isLastMovement ? 'Finish early' : 'Next movement'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSkipSegment}
            className="mt-6 w-full rounded-lg bg-zinc-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-600"
          >
            Skip segment
          </button>
        </div>
      )}
    </section>
  )
}
