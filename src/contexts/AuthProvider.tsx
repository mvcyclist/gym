import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import {
  bindLedgerToUser,
  hydrateLedgerFromCloud,
  importLocalLedgerToCloud,
  resetLedgerRepository,
  shouldOfferLocalImport,
  skipLocalImport,
} from '../services/ledgerRepository'
import { AuthContext, type AuthContextValue } from './authContext'

function getAuthRedirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

async function loadLedgerForUser(userId: string): Promise<boolean> {
  bindLedgerToUser(userId)
  await hydrateLedgerFromCloud(userId)
  return shouldOfferLocalImport(userId)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(configured)
  const [ledgerReady, setLedgerReady] = useState(!configured)
  const [ledgerVersion, setLedgerVersion] = useState(0)
  const [importOfferOpen, setImportOfferOpen] = useState(false)

  const handleSignedOut = useCallback(() => {
    resetLedgerRepository()
    setLedgerReady(true)
    setImportOfferOpen(false)
  }, [])

  const handleSignedIn = useCallback(async (userId: string) => {
    setLedgerReady(false)
    try {
      const offerImport = await loadLedgerForUser(userId)
      setLedgerReady(true)
      setLedgerVersion((value) => value + 1)
      setImportOfferOpen(offerImport)
    } catch (error) {
      console.error('[auth] failed to load cloud ledger', error)
      setLedgerReady(true)
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

      void handleSignedIn(nextSession.user.id)
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

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
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
    await handleSignedIn(userId)
  }, [handleSignedIn, session])

  const importLocalHistory = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    await importLocalLedgerToCloud(userId)
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
      loading: authLoading || (configured && !!session?.user && !ledgerReady),
      user: session?.user ?? null,
      ledgerReady: !configured || ledgerReady,
      ledgerVersion,
      importOfferOpen,
      signInWithGoogle,
      signOut,
      importLocalHistory,
      dismissImportOffer,
      refreshLedger,
    }),
    [
      authLoading,
      configured,
      dismissImportOffer,
      importLocalHistory,
      importOfferOpen,
      ledgerReady,
      ledgerVersion,
      refreshLedger,
      session,
      signInWithGoogle,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
