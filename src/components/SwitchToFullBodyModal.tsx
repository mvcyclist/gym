interface SwitchToFullBodyModalProps {
  open: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function SwitchToFullBodyModal({
  open,
  busy = false,
  onConfirm,
  onCancel,
}: SwitchToFullBodyModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-lg font-bold text-white">Switch to Full Body program?</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Your week becomes Mon / Wed / Fri full-body sessions (mobility, six lifts, core) with
          cardio-or-rest flex days. Past Push / Pull / Leg logs stay in history — coaching still
          uses per-exercise records.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-zinc-500">
          <li>· This week&apos;s plan overrides reset to the new rhythm</li>
          <li>· Recommendations use Full Body + your cardio types</li>
          <li>· Static routine from your locked exercise list</li>
        </ul>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? 'Switching…' : 'Switch program'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
