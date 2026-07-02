import { useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { UserProfileProvider } from '../contexts/UserProfileContext'
import { ImportLocalHistoryModal } from './ImportLocalHistoryModal'
import { NewUserSetupFlow } from './NewUserSetupFlow'
import { SignInScreen } from './SignInScreen'

export function AuthGate({ children }: { children: ReactNode }) {
  const {
    configured,
    loading,
    user,
    profileReady,
    importOfferOpen,
    signInWithGoogle,
    importLocalHistory,
    dismissImportOffer,
  } = useAuth()
  const profileState = useUserProfile()
  const { profile, onboardingComplete, refresh } = profileState
  const [signInError, setSignInError] = useState<string | null>(null)

  const showOnboarding = !onboardingComplete
  const signedInOrLocal = !configured || Boolean(user)

  if (!configured) {
    if (showOnboarding) {
      return (
        <NewUserSetupFlow
          profile={profile}
          onComplete={refresh}
          onCancel={refresh}
        />
      )
    }
    return (
      <UserProfileProvider value={profileState}>
        {children}
      </UserProfileProvider>
    )
  }

  if (loading || (configured && user && !profileReady)) {
    return (
      <div style={{
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

  if (signedInOrLocal && showOnboarding) {
    return (
      <NewUserSetupFlow
        profile={profile}
        onComplete={refresh}
        onCancel={refresh}
      />
    )
  }

  return (
    <>
      <UserProfileProvider value={profileState}>
        {children}
      </UserProfileProvider>
      <ImportLocalHistoryModal
        open={importOfferOpen}
        onImport={() => void importLocalHistory()}
        onSkip={dismissImportOffer}
      />
    </>
  )
}
