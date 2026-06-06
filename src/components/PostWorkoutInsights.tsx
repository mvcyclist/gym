import type { WorkoutRecommendation } from '../types/training'
import {
  isSessionSummary,
  type TodaySummary,
  type WorkoutSessionSummary,
} from '../utils/workoutSummary'

interface PostWorkoutInsightsProps {
  todaySummary: TodaySummary
  tomorrowRecommendation: WorkoutRecommendation
  onStartTomorrow?: () => void
  onDismiss?: () => void
  variant?: 'modal' | 'inline'
}

function SessionStats({ summary }: { summary: WorkoutSessionSummary }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl bg-zinc-900/60 px-3 py-2">
        <dt className="text-xs text-zinc-500">Sets</dt>
        <dd className="text-lg font-semibold text-white">
          {summary.completedSets}/{summary.totalSets}
        </dd>
      </div>
      <div className="rounded-xl bg-zinc-900/60 px-3 py-2">
        <dt className="text-xs text-zinc-500">Exercises</dt>
        <dd className="text-lg font-semibold text-white">
          {summary.exercisesLogged}/{summary.exerciseCount}
        </dd>
      </div>
      {summary.durationMinutes !== undefined && (
        <div className="rounded-xl bg-zinc-900/60 px-3 py-2">
          <dt className="text-xs text-zinc-500">Duration</dt>
          <dd className="text-lg font-semibold text-white">{summary.durationMinutes} min</dd>
        </div>
      )}
      <div className="rounded-xl bg-zinc-900/60 px-3 py-2">
        <dt className="text-xs text-zinc-500">Status</dt>
        <dd className="text-lg font-semibold text-white capitalize">{summary.status}</dd>
      </div>
    </dl>
  )
}

export function PostWorkoutInsights({
  todaySummary,
  tomorrowRecommendation,
  onStartTomorrow,
  onDismiss,
  variant = 'inline',
}: PostWorkoutInsightsProps) {
  const isModal = variant === 'modal'

  return (
    <div className={isModal ? 'space-y-5' : 'space-y-4'}>
      <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-zinc-900/80 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Today&apos;s session
        </p>

        {isSessionSummary(todaySummary) ? (
          <>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              {todaySummary.workoutTitle}
              {todaySummary.status === 'partial' && (
                <span className="ml-2 text-base font-medium text-amber-300">· saved progress</span>
              )}
            </h2>
            <SessionStats summary={todaySummary} />
            {todaySummary.highlights.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {todaySummary.highlights.map((item) => (
                  <li key={item.name} className="text-sm text-zinc-300">
                    <span className="font-medium text-zinc-100">{item.name}</span>
                    <span className="text-zinc-500"> — {item.completedSets} sets logged</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{todaySummary.title}</h2>
            <ul className="mt-3 space-y-1">
              {todaySummary.lines.map((line) => (
                <li key={line} className="text-sm text-zinc-300 before:mr-2 before:content-['•']">
                  {line}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-zinc-900/80 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
          Tomorrow&apos;s suggestion
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          {tomorrowRecommendation.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{tomorrowRecommendation.reason}</p>

        {tomorrowRecommendation.warnings && tomorrowRecommendation.warnings.length > 0 && (
          <ul className="mt-3 space-y-1">
            {tomorrowRecommendation.warnings.map((warning) => (
              <li
                key={warning}
                className="text-sm text-amber-300/90 before:mr-2 before:content-['•']"
              >
                {warning}
              </li>
            ))}
          </ul>
        )}

        {(onStartTomorrow || onDismiss) && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-white"
              >
                Done
              </button>
            )}
            {onStartTomorrow && tomorrowRecommendation.workoutType !== 'Rest' && (
              <button
                type="button"
                onClick={onStartTomorrow}
                className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
              >
                Preview {tomorrowRecommendation.workoutType} workout
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
