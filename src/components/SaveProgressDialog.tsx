interface SaveProgressDialogProps {
  open: boolean
  completedSets: number
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function SaveProgressDialog({
  open,
  completedSets,
  onSave,
  onDiscard,
  onCancel,
}: SaveProgressDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-progress-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <h2 id="save-progress-title" className="text-xl font-bold text-white">
          Save today&apos;s progress?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          You&apos;ve logged {completedSets} completed set{completedSets === 1 ? '' : 's'} today.
          Save it to your calendar or discard this session.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Save progress
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Discard
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
