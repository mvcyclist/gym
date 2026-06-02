import { mobilityExercises } from '../data/mobility'

interface MobilityViewProps {
  onBack: () => void
}

export function MobilityView({ onBack }: MobilityViewProps) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
      >
        Back to home
      </button>

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Mobility</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Movement prep & recovery</h1>
        <p className="mt-2 text-zinc-400">
          Stretching, warm-ups, and recovery. Use Timer Only if you want a rest clock.
        </p>
      </div>

      <ol className="space-y-3">
        {mobilityExercises.map((exercise, index) => (
          <li
            key={exercise.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-zinc-500">#{index + 1}</p>
                <h2 className="text-lg font-semibold text-white">{exercise.name}</h2>
              </div>
              <span className="shrink-0 text-xs font-medium text-zinc-400">{exercise.duration}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{exercise.focus}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-center text-xs text-zinc-600">
        Detailed mobility videos and cues coming soon.
      </p>
    </section>
  )
}
