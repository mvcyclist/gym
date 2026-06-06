import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { SyncHistoryModal } from './SyncHistoryModal'

interface UserMenuProps {
  email?: string | null
  onSignOut: () => void
}

export function UserMenu({ email, onSignOut }: UserMenuProps) {
  const {
    deviceLedgerSummary,
    pushDeviceHistoryToCloud,
    pullLedgerFromCloud,
  } = useAuth()
  const [syncMode, setSyncMode] = useState<'push' | 'pull' | null>(null)
  const [busy, setBusy] = useState(false)

  if (!email) return null

  const handleConfirm = async () => {
    if (!syncMode) return
    setBusy(true)
    try {
      if (syncMode === 'push') {
        await pushDeviceHistoryToCloud()
      } else {
        await pullLedgerFromCloud()
      }
      setSyncMode(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-end gap-2 px-4 pt-4 sm:gap-3 sm:px-6">
        <span className="truncate text-xs text-zinc-500">{email}</span>
        <button
          type="button"
          onClick={() => setSyncMode('push')}
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Sync to cloud
        </button>
        <button
          type="button"
          onClick={() => setSyncMode('pull')}
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Refresh from cloud
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          Sign out
        </button>
      </div>

      <SyncHistoryModal
        open={syncMode !== null}
        mode={syncMode ?? 'push'}
        sessions={deviceLedgerSummary.sessions}
        manualActivities={deviceLedgerSummary.manualActivities}
        busy={busy}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setSyncMode(null)}
      />
    </>
  )
}
