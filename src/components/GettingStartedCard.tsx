import { RECOMMENDATION_MIN_ACTIVE_DAYS } from '../services/recommendationReadiness'

interface GettingStartedCardProps {
  activeDaysCount: number
  onStartWorkout: () => void
  onLogRecentDays: () => void
}

export function GettingStartedCard({
  activeDaysCount,
  onStartWorkout,
  onLogRecentDays,
}: GettingStartedCardProps) {
  const isAlmostReady =
    activeDaysCount > 0 && activeDaysCount < RECOMMENDATION_MIN_ACTIVE_DAYS
  const daysRemaining = RECOMMENDATION_MIN_ACTIVE_DAYS - activeDaysCount

  return (
    <section className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {isAlmostReady ? 'Almost ready' : 'Getting started'}
      </p>

      <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
        {isAlmostReady
          ? `${activeDaysCount} of ${RECOMMENDATION_MIN_ACTIVE_DAYS} days logged`
          : 'Build your training history'}
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        {isAlmostReady ? (
          <>
            Log {daysRemaining} more day{daysRemaining === 1 ? '' : 's'} with any activity
            (strength, cardio, mobility, rest, etc.) and we&apos;ll recommend what to do next.
          </>
        ) : (
          <>
            We need {RECOMMENDATION_MIN_ACTIVE_DAYS} days of activity before we can suggest
            today&apos;s workout. Complete a session here, or log your last few training days.
          </>
        )}
      </p>

      {isAlmostReady && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-red-500 transition-all"
            style={{ width: `${(activeDaysCount / RECOMMENDATION_MIN_ACTIVE_DAYS) * 100}%` }}
          />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onStartWorkout}
          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          Start a workout
        </button>
        <button
          type="button"
          onClick={onLogRecentDays}
          className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Log recent days
        </button>
      </div>
    </section>
  )
}
