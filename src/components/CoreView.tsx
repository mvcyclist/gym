import { useRef, useState } from 'react'
import { getWorkoutById } from '../data/workouts'

interface CoreViewProps {
  onBack: () => void
  onLog: (durationMinutes: number) => void
}

export function CoreView({ onBack, onLog }: CoreViewProps) {
  const mountedAt = useRef(Date.now())
  const [showPrompt, setShowPrompt] = useState(false)
  const [duration, setDuration] = useState(25)
  const coreExercises = getWorkoutById('core')?.exercises ?? []

  const handleBack = () => {
    const elapsed = (Date.now() - mountedAt.current) / 1000
    if (elapsed >= 60) {
      setShowPrompt(true)
    } else {
      onBack()
    }
  }

  const handleLog = () => {
    onLog(duration)
    onBack()
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-lg font-bold text-white">Log core session?</h2>
            <p className="mt-1 text-sm text-zinc-400">How long did you spend?</p>
            <div className="mt-5 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setDuration((d) => Math.max(5, d - 5))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-lg font-bold text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800"
              >
                −
              </button>
              <span className="min-w-[6rem] text-center text-2xl font-bold text-white">{duration} min</span>
              <button
                type="button"
                onClick={() => setDuration((d) => Math.min(60, d + 5))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-lg font-bold text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800"
              >
                +
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleLog}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-500"
              >
                Log session
              </button>
              <button
                type="button"
                onClick={onBack}
                className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-900"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleBack}
        className="mb-6 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
      >
        Back to home
      </button>

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Core</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Core session</h1>
        <p className="mt-2 text-zinc-400">
          Anti-extension, rotation, and stability. Aim for 3 rounds of each.
        </p>
      </div>

      <ol className="space-y-3">
        {coreExercises.map((exercise, index) => (
          <li
            key={exercise.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-zinc-500">#{index + 1}</p>
                <h2 className="text-lg font-semibold text-white">{exercise.name}</h2>
              </div>
              <span className="shrink-0 text-xs font-medium text-zinc-400">
                {exercise.sets} × {exercise.reps}
              </span>
            </div>
            {exercise.primaryMuscles.length > 0 && (
              <p className="mt-1 text-sm text-zinc-500">{exercise.primaryMuscles.join(', ')}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
