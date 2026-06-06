import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'

export interface AuthContextValue {
  configured: boolean
  loading: boolean
  user: User | null
  ledgerReady: boolean
  ledgerVersion: number
  importOfferOpen: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  importLocalHistory: () => Promise<void>
  dismissImportOffer: () => void
  refreshLedger: () => Promise<void>
  pushDeviceHistoryToCloud: () => Promise<void>
  pullLedgerFromCloud: () => Promise<void>
  deviceLedgerSummary: { sessions: number; manualActivities: number }
}

export const AuthContext = createContext<AuthContextValue | null>(null)
