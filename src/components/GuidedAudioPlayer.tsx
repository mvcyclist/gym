import { useEffect, useRef, useState } from 'react'
import { useGuidedAudioPlayer } from '../hooks/useGuidedAudioPlayer'
import { formatPlaybackClock } from '../utils/guidedRoutineChapters'
import type { GuidedRoutine } from '../types/guidedRoutine'

type PlayerPhase = 'preview' | 'active'

interface GuidedAudioPlayerProps {
  routine: GuidedRoutine
  segmentTitle: string
  playbackPositionSeconds: number
  segmentStartedAt: string | null | undefined
  muted: boolean
  onPlaybackPositionChange: (seconds: number) => void
  onSegmentActiveStart: () => void
  onComplete: (durationSeconds: number, status: 'completed' | 'partial') => void
  onBack: () => void
  embedded?: boolean
}

function previewChapters(routine: GuidedRoutine) {
  return routine.chapters.filter((chapter) => chapter.id !== 'intro' && chapter.id !== 'outro')
}

export function GuidedAudioPlayer({
  routine,
  segmentTitle,
  playbackPositionSeconds,
  segmentStartedAt,
  muted,
  onPlaybackPositionChange,
  onSegmentActiveStart,
  onComplete,
  onBack,
  embedded = false,
}: GuidedAudioPlayerProps) {
  const resumeActive = Boolean(segmentStartedAt) || playbackPositionSeconds > 0
  const [phase, setPhase] = useState<PlayerPhase>(() => (resumeActive ? 'active' : 'preview'))
  const shouldAutoPlayRef = useRef(resumeActive)

  const {
    status,
    currentTime,
    currentChapterTitle,
    nextChapterTitle,
    play,
    pause,
    restart,
    seek,
    error,
  } = useGuidedAudioPlayer({
    routine,
    resumePositionSeconds: playbackPositionSeconds,
    muted,
    onPlaybackPositionChange,
    onComplete: (durationSeconds) => onComplete(durationSeconds, 'completed'),
  })

  useEffect(() => {
    if (phase === 'active' && shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false
      play()
    }
  }, [phase, play])

  const beginSegment = () => {
    onSegmentActiveStart()
    shouldAutoPlayRef.current = true
    setPhase('active')
  }

  const handleSkipSegment = () => {
    const duration = Math.max(1, Math.round(currentTime || playbackPositionSeconds))
    onComplete(duration, 'partial')
  }

  const elapsed = formatPlaybackClock(currentTime)
  const remaining = formatPlaybackClock(Math.max(0, routine.durationSeconds - currentTime))
  const chapters = previewChapters(routine)

  return (
    <section className={embedded ? 'w-full' : 'mx-auto w-full max-w-3xl px-4 py-6 sm:px-6'}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-red-500">Full Body</p>
          <h2 className="text-[28px] font-bold text-white">{segmentTitle}</h2>
          <p className="mt-1 text-sm text-zinc-400">{routine.title}</p>
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
            {chapters.length} sections · ~{Math.max(1, Math.round(routine.durationSeconds / 60))} min · audio guided
          </p>
          <ol className="mt-6 space-y-3">
            {chapters.map((chapter, index) => (
              <li
                key={chapter.id}
                className="flex items-center justify-between rounded-lg bg-zinc-950/60 px-4 py-3 text-sm"
              >
                <span className="text-zinc-200">
                  {index + 1}. {chapter.title}
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={beginSegment}
            className="mt-8 w-full rounded-xl bg-red-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-red-500"
          >
            Start {segmentTitle.toLowerCase()}
          </button>
        </div>
      )}

      {phase === 'active' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Now</p>
          <h3 className="mt-2 text-2xl font-bold text-white">{currentChapterTitle}</h3>
          {nextChapterTitle && (
            <p className="mt-2 text-sm text-zinc-400">
              Up next: <span className="text-zinc-300">{nextChapterTitle}</span>
            </p>
          )}

          <div className="mt-8 flex items-center justify-between text-sm tabular-nums text-zinc-400">
            <span>{elapsed}</span>
            <span>-{remaining}</span>
          </div>

          <input
            type="range"
            min={0}
            max={routine.durationSeconds}
            step={1}
            value={Math.min(currentTime, routine.durationSeconds)}
            onChange={(event) => seek(Number(event.target.value))}
            className="mt-3 w-full accent-red-500"
            aria-label="Seek audio"
          />

          {error && (
            <p className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {status === 'playing' ? (
              <button
                type="button"
                onClick={pause}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={play}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                {status === 'paused' ? 'Resume' : 'Play'}
              </button>
            )}
            <button
              type="button"
              onClick={restart}
              className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              Restart
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
