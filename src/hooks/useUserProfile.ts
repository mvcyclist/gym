import { useCallback, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { getUserProfile, saveUserProfile } from '../services/userProfileRepository'
import type { UserProfile } from '../types/userProfile'

export function useUserProfile() {
  const { profileVersion } = useAuth()
  const [version, setVersion] = useState(0)

  const profile = useMemo((): UserProfile => {
    void version
    void profileVersion
    return getUserProfile()
  }, [version, profileVersion])

  const refresh = useCallback(() => {
    setVersion((value) => value + 1)
  }, [])

  const persist = useCallback(
    (next: UserProfile) => {
      saveUserProfile(next)
      refresh()
    },
    [refresh],
  )

  return {
    profile,
    refresh,
    persist,
    onboardingComplete: profile.onboardingComplete,
  } as const
}
