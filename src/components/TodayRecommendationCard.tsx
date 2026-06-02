import type { WorkoutRecommendation } from '../types/training'

interface TodayRecommendationCardProps {
  recommendation: WorkoutRecommendation
  onStart: () => void
  onChooseAnother: () => void
}

export function TodayRecommendationCard({
  recommendation,
  onStart,
  onChooseAnother,
}: TodayRecommendationCardProps) {
  return (
    <section className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-zinc-900/80 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
        Today&apos;s Recommendation
      </p>

      <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{recommendation.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{recommendation.reason}</p>

      {recommendation.warnings && recommendation.warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {recommendation.warnings.map((warning) => (
            <li
              key={warning}
              className="text-sm text-amber-300/90 before:mr-2 before:content-['•']"
            >
              {warning}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          {recommendation.workoutType === 'Rest' ? 'Start recovery' : 'Start Workout'}
        </button>
        <button
          type="button"
          onClick={onChooseAnother}
          className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Choose Another
        </button>
      </div>
    </section>
  )
}
