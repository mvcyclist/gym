import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import {
  bindLedgerToUser,
  getDeviceLedgerSummary,
  hydrateLedgerFromCloud,
  pullLedgerFromCloud,
  pushDeviceHistoryToCloud,
  refreshMergedLedgerFromCloud,
  resetLedgerRepository,
  shouldOfferLocalImport,
  skipLocalImport,
} from '../services/ledgerRepository'
import {
  getSyncStatus,
  processSyncQueue,
  recordHydrateFailure,
  subscribeSyncStatus,
  syncLedgerWithCloud,
} from '../services/syncQueueService'
import type { SyncStatus } from '../services/syncQueueService'
import { AuthContext, type AuthContextValue } from './authContext'

function getAuthRedirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

async function loadLedgerForUser(userId: string): Promise<boolean> {
  bindLedgerToUser(userId)
  await hydrateLedgerFromCloud(userId)
  await processSyncQueue(userId)
  return shouldOfferLocalImport(userId)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(configured)
  const [ledgerReady, setLedgerReady] = useState(!configured)
  const [initialLedgerLoaded, setInitialLedgerLoaded] = useState(!configured)
  const [ledgerVersion, setLedgerVersion] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus)
  const [importOfferOpen, setImportOfferOpen] = useState(false)
  const hydratedUserIdRef = useRef<string | null>(null)
  const initialLedgerLoadedRef = useRef(!configured)

  const handleSignedOut = useCallback(() => {
    resetLedgerRepository()
    hydratedUserIdRef.current = null
    initialLedgerLoadedRef.current = !configured
    setInitialLedgerLoaded(!configured)
    setLedgerReady(!configured)
    setImportOfferOpen(false)
  }, [configured])

  const handleSignedIn = useCallback(async (userId: string) => {
    const isFirstLoadForUser = hydratedUserIdRef.current !== userId
    if (isFirstLoadForUser && !initialLedgerLoadedRef.current) {
      setLedgerReady(false)
    }
    try {
      const offerImport = await loadLedgerForUser(userId)
      hydratedUserIdRef.current = userId
      initialLedgerLoadedRef.current = true
      setLedgerReady(true)
      setInitialLedgerLoaded(true)
      setLedgerVersion((value) => value + 1)
      setImportOfferOpen(offerImport)
    } catch (error) {
      console.error('[auth] failed to load cloud ledger', error)
      recordHydrateFailure(userId, error)
      setLedgerReady(true)
      if (hydratedUserIdRef.current === userId) {
        initialLedgerLoadedRef.current = true
        setInitialLedgerLoaded(true)
      }
    }
  }, [])

  useEffect(() => {
    if (!configured) return

    const supabase = getSupabase()
    let cancelled = false

    const applySession = (nextSession: Session | null) => {
      if (cancelled) return
      setSession(nextSession)
      setAuthLoading(false)

      if (!nextSession?.user) {
        handleSignedOut()
        return
      }

      const userId = nextSession.user.id
      if (hydratedUserIdRef.current === userId && initialLedgerLoadedRef.current) {
        return
      }

      void handleSignedIn(userId)
    }

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [configured, handleSignedIn, handleSignedOut])

  useEffect(() => subscribeSyncStatus(() => setSyncStatus(getSyncStatus())), [])

  useEffect(() => {
    if (!configured || !session?.user || !ledgerReady) return

    const runSync = () => {
      if (document.visibilityState !== 'visible') return
      void syncLedgerWithCloud(session.user.id, refreshMergedLedgerFromCloud)
        .then(() => setLedgerVersion((value) => value + 1))
        .catch((error) => {
          recordHydrateFailure(session.user.id, error)
          console.error('[auth] failed to refresh from cloud', error)
        })
    }

    const runQueueOnly = () => {
      void processSyncQueue(session.user.id)
    }

    window.addEventListener('focus', runSync)
    document.addEventListener('visibilitychange', runSync)
    window.addEventListener('online', runQueueOnly)
    return () => {
      window.removeEventListener('focus', runSync)
      document.removeEventListener('visibilitychange', runSync)
      window.removeEventListener('online', runQueueOnly)
    }
  }, [configured, ledgerReady, session?.user])

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) throw error
    if (data.url) {
      window.location.assign(data.url)
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    handleSignedOut()
  }, [handleSignedOut])

  const refreshLedger = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    bindLedgerToUser(userId)
    await syncLedgerWithCloud(userId, refreshMergedLedgerFromCloud)
    setLedgerVersion((value) => value + 1)
  }, [session])

  const retrySync = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    await syncLedgerWithCloud(userId, refreshMergedLedgerFromCloud)
    setLedgerVersion((value) => value + 1)
  }, [session])

  const pushDeviceHistory = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    setLedgerReady(false)
    try {
      await pushDeviceHistoryToCloud(userId)
      setLedgerVersion((value) => value + 1)
    } finally {
      setLedgerReady(true)
    }
  }, [session])

  const pullDeviceHistory = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    setLedgerReady(false)
    try {
      await pullLedgerFromCloud(userId)
      setLedgerVersion((value) => value + 1)
    } finally {
      setLedgerReady(true)
    }
  }, [session])

  const importLocalHistory = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    await pushDeviceHistoryToCloud(userId)
    setImportOfferOpen(false)
    setLedgerVersion((value) => value + 1)
  }, [session])

  const dismissImportOffer = useCallback(() => {
    const userId = session?.user?.id
    if (userId) skipLocalImport(userId)
    setImportOfferOpen(false)
  }, [session])

  const value = useMemo(
    (): AuthContextValue => ({
      configured,
      loading:
        authLoading ||
        (configured && !!session?.user && !ledgerReady && !initialLedgerLoaded),
      user: session?.user ?? null,
      ledgerReady: !configured || ledgerReady,
      ledgerVersion,
      syncStatus,
      importOfferOpen,
      signInWithGoogle,
      signOut,
      importLocalHistory,
      dismissImportOffer,
      refreshLedger,
      retrySync,
      pushDeviceHistoryToCloud: pushDeviceHistory,
      pullLedgerFromCloud: pullDeviceHistory,
      deviceLedgerSummary: getDeviceLedgerSummary(),
    }),
    [
      authLoading,
      configured,
      dismissImportOffer,
      importLocalHistory,
      importOfferOpen,
      initialLedgerLoaded,
      ledgerReady,
      ledgerVersion,
      refreshLedger,
      retrySync,
      pushDeviceHistory,
      pullDeviceHistory,
      session,
      signInWithGoogle,
      signOut,
      syncStatus,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
