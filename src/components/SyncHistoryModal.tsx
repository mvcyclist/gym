interface SyncHistoryModalProps {
  open: boolean
  mode: 'push' | 'pull'
  sessions: number
  manualActivities: number
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function SyncHistoryModal({
  open,
  mode,
  sessions,
  manualActivities,
  busy = false,
  onConfirm,
  onCancel,
}: SyncHistoryModalProps) {
  if (!open) return null

  const isPush = mode === 'push'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <div
        role="dialog"
        aria-labelledby="sync-history-title"
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
      >
        <h2 id="sync-history-title" className="text-xl font-bold text-white">
          {isPush ? 'Sync this device to cloud?' : 'Refresh from cloud?'}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {isPush ? (
            <>
              This device has <strong className="text-zinc-200">{sessions}</strong> logged workout
              {sessions === 1 ? '' : 's'} and <strong className="text-zinc-200">{manualActivities}</strong>{' '}
              manual activit{manualActivities === 1 ? 'y' : 'ies'}. Cloud history will be replaced with
              this data so your other devices match.
            </>
          ) : (
            <>
              Download the latest workout history from your account and replace what is stored on this
              device.
            </>
          )}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition enabled:hover:border-zinc-500 enabled:hover:bg-zinc-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition enabled:hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? 'Syncing…' : isPush ? 'Sync to cloud' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  )
}
