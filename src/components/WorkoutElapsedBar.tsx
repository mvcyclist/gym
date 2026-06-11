import { formatTime } from '../utils/formatTime'

interface WorkoutElapsedBarProps {
  elapsedSeconds: number
}

export function WorkoutElapsedBar({ elapsedSeconds }: WorkoutElapsedBarProps) {
  return (
    <header className="border-b border-zinc-800 bg-black/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Workout time
          </p>
          <div
            className="font-mono text-4xl font-bold leading-none tracking-tight text-white sm:text-5xl"
            aria-live="polite"
          >
            {formatTime(elapsedSeconds)}
          </div>
        </div>
      </div>
    </header>
  )
}
