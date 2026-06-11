interface LeaveWorkoutDialogProps {
  open: boolean
  completedSets: number
  onPauseAndResume: () => void
  onEndWorkout: () => void
  onCancel: () => void
}

export function LeaveWorkoutDialog({
  open,
  completedSets,
  onPauseAndResume,
  onEndWorkout,
  onCancel,
}: LeaveWorkoutDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-workout-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <h2 id="leave-workout-title" className="text-xl font-bold text-white">
          Leave workout?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {completedSets > 0
            ? `You've logged ${completedSets} completed set${completedSets === 1 ? '' : 's'}. Pause to pick up later, or end the workout now.`
            : "You haven't logged any sets yet. Pause to pick up later, or end and discard this session."}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onPauseAndResume}
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Pause and resume later
          </button>
          <button
            type="button"
            onClick={onEndWorkout}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            End workout
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-500 transition hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
