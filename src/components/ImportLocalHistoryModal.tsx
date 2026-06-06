interface ImportLocalHistoryModalProps {
  open: boolean
  onImport: () => void
  onSkip: () => void
}

export function ImportLocalHistoryModal({ open, onImport, onSkip }: ImportLocalHistoryModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <div
        role="dialog"
        aria-labelledby="import-history-title"
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
      >
        <h2 id="import-history-title" className="text-xl font-bold text-white">
          Import workout history?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          This browser has workout history saved locally. Import it to your account so it syncs
          across devices?
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onImport}
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
