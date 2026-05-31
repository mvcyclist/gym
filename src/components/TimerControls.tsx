import type { TimerStatus } from '../types/workout'

const QUICK_DURATIONS = [30, 60, 90, 120, 180] as const

interface TimerControlsProps {
  status: TimerStatus
  duration: number
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onAdjust: (deltaSeconds: number) => void
  onSetDuration: (seconds: number) => void
}

export function TimerControls({
  status,
  duration,
  onStart,
  onPause,
  onReset,
  onAdjust,
  onSetDuration,
}: TimerControlsProps) {
  const isRunning = status === 'running'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {isRunning ? (
          <button
            type="button"
            onClick={onPause}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-600"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Start
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => onAdjust(-15)}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          −15s
        </button>
        <button
          type="button"
          onClick={() => onAdjust(15)}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          +15s
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {QUICK_DURATIONS.map((seconds) => {
          const isActive = duration === seconds && status !== 'running'
          return (
            <button
              key={seconds}
              type="button"
              onClick={() => onSetDuration(seconds)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800'
              }`}
            >
              {seconds}s
            </button>
          )
        })}
      </div>
    </div>
  )
}
