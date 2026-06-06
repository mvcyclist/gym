import type { WorkoutRecommendation } from '../types/training'
import type { TodaySummary } from '../utils/workoutSummary'
import { PostWorkoutInsights } from './PostWorkoutInsights'

interface WorkoutCompleteSummaryDialogProps {
  open: boolean
  todaySummary: TodaySummary
  tomorrowRecommendation: WorkoutRecommendation
  onDismiss: () => void
  onStartTomorrow?: () => void
}

export function WorkoutCompleteSummaryDialog({
  open,
  todaySummary,
  tomorrowRecommendation,
  onDismiss,
  onStartTomorrow,
}: WorkoutCompleteSummaryDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-complete-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:p-6"
      >
        <h1 id="workout-complete-title" className="mb-4 text-xl font-bold text-white">
          Workout logged
        </h1>
        <PostWorkoutInsights
          variant="modal"
          todaySummary={todaySummary}
          tomorrowRecommendation={tomorrowRecommendation}
          onDismiss={onDismiss}
          onStartTomorrow={onStartTomorrow}
        />
      </div>
    </div>
  )
}
