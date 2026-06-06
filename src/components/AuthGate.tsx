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
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <p className="text-sm text-zinc-400">Loading your workout history…</p>
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
