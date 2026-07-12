import { segmentTransitionAfter } from '../data/fullBodySessionPlan'
import type { FullBodySegmentId } from '../types/fullBodySession'

interface SegmentTransitionCardProps {
  afterSegment: FullBodySegmentId
  onContinue: () => void
  onBack: () => void
  embedded?: boolean
}

export function SegmentTransitionCard({
  afterSegment,
  onContinue,
  onBack,
  embedded = false,
}: SegmentTransitionCardProps) {
  const transition = segmentTransitionAfter(afterSegment)
  if (!transition) return null

  return (
    <section
      className={
        embedded ? 'w-full' : 'mx-auto w-full max-w-3xl px-4 py-8 sm:px-6'
      }
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-6 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
      >
        Back to workouts
      </button>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-red-500">Up next</p>
        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{transition.title}</h2>
        <p className="mt-2 text-sm font-semibold text-zinc-400">{transition.subtitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{transition.description}</p>

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 w-full rounded-xl bg-red-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-red-500"
        >
          Continue
        </button>
      </div>
    </section>
  )
}
