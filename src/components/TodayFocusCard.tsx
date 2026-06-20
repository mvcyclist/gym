import type { WorkoutRecommendation } from '../types/training'
import { isSessionSummary, type TodaySummary } from '../utils/workoutSummary'

interface PreWorkoutProps {
  recommendation: WorkoutRecommendation
  onStart: () => void
  onChooseAnother: () => void
}

function PreWorkoutState({ recommendation, onStart, onChooseAnother }: PreWorkoutProps) {
  return (
    <>
      <h2 className="text-2xl font-bold text-white">{recommendation.title}</h2>
      <div className="mt-3 rounded-xl bg-zinc-800/60 px-4 py-3">
        <p className="text-sm leading-relaxed text-zinc-300">{recommendation.reason}</p>
        {recommendation.warnings && recommendation.warnings.length > 0 && (
          <ul className="mt-2 space-y-1">
            {recommendation.warnings.map((w) => (
              <li key={w} className="text-xs text-amber-300/90 before:mr-2 before:content-['•']">
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          {recommendation.workoutType === 'Rest' ? 'Start recovery' : 'Start workout'}
        </button>
        <button
          type="button"
          onClick={onChooseAnother}
          className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Choose another
        </button>
      </div>
    </>
  )
}

interface PostWorkoutProps {
  todaySummary: TodaySummary
  tomorrowRecommendation: WorkoutRecommendation
  onStartTomorrow?: () => void
}

function PostWorkoutState({ todaySummary, tomorrowRecommendation, onStartTomorrow }: PostWorkoutProps) {
  const title = isSessionSummary(todaySummary) ? todaySummary.workoutTitle : todaySummary.title
  const duration = isSessionSummary(todaySummary) ? todaySummary.durationMinutes : undefined

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-zinc-100">{title}</p>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
          Done
        </span>
      </div>
      {duration !== undefined && (
        <p className="mt-1 text-sm text-zinc-500">{duration} min</p>
      )}

      <div className="my-4 border-t border-zinc-800" />

      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Tomorrow
      </p>
      <p className="text-lg font-bold text-white">{tomorrowRecommendation.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{tomorrowRecommendation.reason}</p>
      {onStartTomorrow && tomorrowRecommendation.workoutType !== 'Rest' && (
        <button
          type="button"
          onClick={onStartTomorrow}
          className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Preview {tomorrowRecommendation.workoutType} workout
        </button>
      )}
    </>
  )
}

interface TodayFocusCardProps {
  recommendation: WorkoutRecommendation | null
  todayLogged: boolean
  todaySummary: TodaySummary | null
  tomorrowRecommendation: WorkoutRecommendation | null
  onStart: () => void
  onChooseAnother: () => void
  onStartTomorrow?: () => void
}

export function TodayFocusCard({
  recommendation,
  todayLogged,
  todaySummary,
  tomorrowRecommendation,
  onStart,
  onChooseAnother,
  onStartTomorrow,
}: TodayFocusCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-5">
      {todayLogged && todaySummary && tomorrowRecommendation ? (
        <PostWorkoutState
          todaySummary={todaySummary}
          tomorrowRecommendation={tomorrowRecommendation}
          onStartTomorrow={onStartTomorrow}
        />
      ) : recommendation ? (
        <PreWorkoutState
          recommendation={recommendation}
          onStart={onStart}
          onChooseAnother={onChooseAnother}
        />
      ) : null}
    </div>
  )
}
