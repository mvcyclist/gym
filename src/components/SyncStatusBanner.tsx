import { useAuth } from '../hooks/useAuth'

export function SyncStatusBanner() {
  const { configured, user, syncStatus, retrySync } = useAuth()

  if (!configured || !user) return null
  if (syncStatus.state === 'idle' && !syncStatus.coachingMayBeStale) return null

  const isError = syncStatus.state === 'error' || syncStatus.coachingMayBeStale
  const isPending = syncStatus.state === 'pending' || syncStatus.state === 'syncing'

  return (
    <div
      className="border-b px-4 py-2.5 sm:px-6"
      style={{
        borderColor: isError ? '#3a2010' : '#1e3a2f',
        backgroundColor: isError ? '#1c0f08' : '#0f1a14',
      }}
    >
      <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
        <div className="min-w-0">
          {isError ? (
            <>
              <p className="text-sm font-medium text-amber-200">
                Workout history hasn&apos;t fully synced
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Last-lift targets and recommendations may be outdated on this device.
                {syncStatus.pendingCount > 0
                  ? ` ${syncStatus.pendingCount} change${syncStatus.pendingCount === 1 ? '' : 's'} waiting to upload.`
                  : ''}
              </p>
            </>
          ) : isPending ? (
            <>
              <p className="text-sm font-medium text-emerald-200/90">Syncing workout history…</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {syncStatus.pendingCount > 0
                  ? `${syncStatus.pendingCount} pending change${syncStatus.pendingCount === 1 ? '' : 's'}`
                  : 'Checking cloud for updates'}
              </p>
            </>
          ) : null}
        </div>

        {(isError || isPending) && (
          <button
            type="button"
            onClick={() => void retrySync()}
            className="shrink-0 rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Retry sync
          </button>
        )}
      </div>
    </div>
  )
}
