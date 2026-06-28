import { useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { ImportLocalHistoryModal } from './ImportLocalHistoryModal'
import { SignInScreen } from './SignInScreen'

export function AuthGate({ children }: { children: ReactNode }) {
  const {
    configured,
    loading,
    user,
    importOfferOpen,
    signInWithGoogle,
    importLocalHistory,
    dismissImportOffer,
  } = useAuth()
  const [signInError, setSignInError] = useState<string | null>(null)

  if (!configured) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        padding: '1rem 2rem',
      }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Checking sign-in…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <SignInScreen
        error={signInError}
        onSignIn={async () => {
          setSignInError(null)
          try {
            await signInWithGoogle()
          } catch (error) {
            setSignInError(error instanceof Error ? error.message : 'Sign-in failed')
          }
        }}
      />
    )
  }

  return (
    <>
      {children}
      <ImportLocalHistoryModal
        open={importOfferOpen}
        onImport={() => void importLocalHistory()}
        onSkip={dismissImportOffer}
      />
    </>
  )
}
