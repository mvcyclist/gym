import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isDevAccount } from '../constants/devAccount'
import { devStartFromScratch, startEditRoutine } from '../services/onboardingService'
import { hasAnyStrengthHistory, defaultTemplateSources } from '../services/workoutTemplateService'
import { getUserProfile, saveUserProfile } from '../services/userProfileRepository'
import { SyncHistoryModal } from './SyncHistoryModal'

interface UserMenuProps {
  email?: string | null
  onSignOut: () => void
  onEditRoutine: () => void
}

export function UserMenu({ email, onSignOut, onEditRoutine }: UserMenuProps) {
  const {
    deviceLedgerSummary,
    pushDeviceHistoryToCloud,
    pullLedgerFromCloud,
    refreshLedger,
  } = useAuth()
  const [open, setOpen] = useState(false)
  const [syncMode, setSyncMode] = useState<'push' | 'pull' | null>(null)
  const [busy, setBusy] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!email) return null

  const isDev = isDevAccount(email)

  const handleConfirm = async () => {
    if (!syncMode) return
    setBusy(true)
    setSyncError(null)
    try {
      if (syncMode === 'push') {
        await pushDeviceHistoryToCloud()
      } else {
        await pullLedgerFromCloud()
      }
      setSyncMode(null)
      setOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      setSyncError(message)
      console.error('[sync]', error)
    } finally {
      setBusy(false)
    }
  }

  const handleEditRoutine = () => {
    startEditRoutine()
    onEditRoutine()
    setOpen(false)
  }

  const handleRestoreFromHistory = () => {
    const profile = getUserProfile()
    const sources = defaultTemplateSources(profile)
    saveUserProfile({ ...profile, templateSources: sources })
    onEditRoutine()
    setOpen(false)
  }

  const handleDevReset = (clearHistory: boolean) => {
    devStartFromScratch(clearHistory)
    if (clearHistory) {
      void refreshLedger()
    }
    onEditRoutine()
    setOpen(false)
  }

  return (
    <>
      <div ref={menuRef} style={{ position: 'relative' }}>
        {syncError && (
          <p style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 6,
            width: 260,
            fontSize: 11,
            color: '#fca5a5',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            padding: '8px 10px',
            zIndex: 50,
          }}>
            Sync failed: {syncError}
          </p>
        )}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          style={{
            background: 'transparent',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            padding: '6px 12px',
            color: 'rgba(255,255,255,0.55)',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
          }}>
            {email.charAt(0).toUpperCase()}
          </span>
          <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email.split('@')[0]}
          </span>
          <span style={{ fontSize: 10, opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            minWidth: 220,
            background: '#1a1a1a',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            padding: 6,
            zIndex: 40,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            <MenuItem onClick={handleEditRoutine}>Edit routine</MenuItem>
            {hasAnyStrengthHistory() && (
              <MenuItem onClick={handleRestoreFromHistory}>Use my logged routines</MenuItem>
            )}
            <MenuItem onClick={() => setSyncMode('push')}>Sync to cloud</MenuItem>
            <MenuItem onClick={() => setSyncMode('pull')}>Refresh from cloud</MenuItem>
            {isDev && (
              <>
                <MenuDivider />
                <MenuItem onClick={() => handleDevReset(false)}>Start from scratch</MenuItem>
                <MenuItem danger onClick={() => handleDevReset(true)}>
                  Reset profile + history
                </MenuItem>
              </>
            )}
            <MenuDivider />
            <MenuItem onClick={() => { setOpen(false); void onSignOut() }}>Sign out</MenuItem>
          </div>
        )}
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

function MenuDivider() {
  return <div style={{ height: 0.5, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderRadius: 6,
        padding: '9px 12px',
        fontSize: 13,
        color: danger ? '#fca5a5' : 'rgba(255,255,255,0.75)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
