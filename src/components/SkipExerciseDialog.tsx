interface SkipExerciseDialogProps {
  open: boolean
  exerciseName: string
  isLastExercise: boolean
  /** When false on the last exercise, skip does not end the session (e.g. full-body main → core). */
  skipFinishesWorkout?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function SkipExerciseDialog({
  open,
  exerciseName,
  isLastExercise,
  skipFinishesWorkout,
  onConfirm,
  onCancel,
}: SkipExerciseDialogProps) {
  if (!open) return null

  const endsWorkout = skipFinishesWorkout ?? isLastExercise

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-exercise-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <h2 id="skip-exercise-title" className="text-xl font-bold text-white">
          {endsWorkout ? `Finish workout without ${exerciseName}?` : `Skip ${exerciseName}?`}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {endsWorkout
            ? "This exercise won't be saved. Your logged sets will be saved and you'll see your workout summary."
            : isLastExercise
              ? "This exercise won't be saved. Continue to the next segment when you're ready."
              : "This exercise won't be saved to your workout log. You'll move on to the next one."}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-zinc-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-500"
          >
            {endsWorkout ? 'Finish workout' : 'Skip exercise'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
