import { formatTime } from '../utils/formatTime'
import type { TimerStatus } from '../types/workout'
import { TimerControls } from './TimerControls'

interface TimerBarProps {
  remaining: number
  duration: number
  status: TimerStatus
  muted: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onAdjust: (deltaSeconds: number) => void
  onSetDuration: (seconds: number) => void
  onToggleMute: () => void
}

export function TimerBar({
  remaining,
  duration,
  status,
  muted,
  onStart,
  onPause,
  onReset,
  onAdjust,
  onSetDuration,
  onToggleMute,
}: TimerBarProps) {
  const displayTime = status === 'idle' && remaining === duration ? duration : remaining
  const isComplete = status === 'complete'

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Rest Timer
            </p>
            <div
              className={`font-mono text-5xl font-bold leading-none tracking-tight sm:text-6xl md:text-7xl ${
                isComplete ? 'text-green-500' : 'text-red-500'
              }`}
              aria-live="polite"
            >
              {isComplete ? 'Rest complete.' : formatTime(displayTime)}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute timer beep' : 'Mute timer beep'}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>

        <TimerControls
          status={status}
          duration={duration}
          onStart={onStart}
          onPause={onPause}
          onReset={onReset}
          onAdjust={onAdjust}
          onSetDuration={onSetDuration}
        />
      </div>
    </header>
  )
}
