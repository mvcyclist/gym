import { useCallback, useMemo, useState } from 'react'
import { getUserProfile, saveUserProfile } from '../services/userProfileRepository'
import type { UserProfile } from '../types/userProfile'

export function useUserProfile() {
  const [version, setVersion] = useState(0)

  const profile = useMemo((): UserProfile => {
    void version
    return getUserProfile()
  }, [version])

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
