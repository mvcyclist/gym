interface PriorDayDraftDialogProps {
  open: boolean
  workoutDateLabel: string
  workoutTitle: string
  completedSets: number
  onSave: () => void
  onReview: () => void
  onDiscard: () => void
}

export function PriorDayDraftDialog({
  open,
  workoutDateLabel,
  workoutTitle,
  completedSets,
  onSave,
  onReview,
  onDiscard,
}: PriorDayDraftDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prior-day-draft-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <h2 id="prior-day-draft-title" className="text-xl font-bold text-white">
          Unfinished workout from {workoutDateLabel}?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Your {workoutTitle} session has {completedSets} completed set
          {completedSets === 1 ? '' : 's'} from {workoutDateLabel}. Save it to your calendar,
          review it, or discard it.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {completedSets > 0 && (
            <button
              type="button"
              onClick={onSave}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Save progress
            </button>
          )}
          <button
            type="button"
            onClick={onReview}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Review workout
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-500 transition hover:text-zinc-300"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}
