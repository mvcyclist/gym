import type { RecommendationResult, QualityBucket } from '../types/training'
import { isSessionSummary, type TodaySummary } from '../utils/workoutSummary'

const BUCKET_STYLES: Record<QualityBucket, string> = {
  Best:     'bg-emerald-500/20 text-emerald-400',
  Good:     'bg-sky-500/20 text-sky-400',
  Marginal: 'bg-amber-500/20 text-amber-400',
  Skip:     'bg-zinc-500/20 text-zinc-400',
}

interface PreWorkoutProps {
  recommendation: RecommendationResult
  onStart: () => void
  onChooseAnother: () => void
}

function PreWorkoutState({ recommendation, onStart, onChooseAnother }: PreWorkoutProps) {
  const { primary, addon } = recommendation

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-white">{primary.type}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BUCKET_STYLES[primary.bucket]}`}>
          {primary.bucket}
        </span>
      </div>

      <div className="rounded-xl bg-zinc-800/60 px-4 py-3 space-y-2">
        <p className="text-sm leading-relaxed text-zinc-300">{primary.reason}</p>
        {primary.warning && (
          <p className="text-xs text-amber-300/90 before:mr-2 before:content-['•']">
            {primary.warning}
          </p>
        )}
        {addon && (
          <p className="text-xs text-zinc-400 border-t border-zinc-700 pt-2">
            <span className="text-zinc-300 font-medium">+ {addon.type}</span>
            {' — '}{addon.reason}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          {['Rest', 'Mobility', 'Walk'].includes(primary.type) ? 'Start recovery' : 'Start workout'}
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
  tomorrowRecommendation: import('../types/training').WorkoutRecommendation
  onStartTomorrow?: () => void
  onChooseAnother: () => void
}

function PostWorkoutState({ todaySummary, tomorrowRecommendation, onStartTomorrow, onChooseAnother }: PostWorkoutProps) {
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

      <div className="mt-4 border-t border-zinc-800 pt-3">
        <button
          type="button"
          onClick={onChooseAnother}
          className="text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          Start a different workout →
        </button>
      </div>
    </>
  )
}

interface TodayFocusCardProps {
  recommendation: RecommendationResult | null
  todayLogged: boolean
  todaySummary: TodaySummary | null
  tomorrowRecommendation: import('../types/training').WorkoutRecommendation | null
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
          onChooseAnother={onChooseAnother}
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
