import { kvGet, kvSet, kvRemove } from '../adapters/localKeyValueStorage'
import { emptyUserProfile, type UserProfile } from '../types/userProfile'

const PROFILE_KEY_BASE = 'userProfile'

let boundUserId: string | null = null

function getProfileKey(): string {
  return boundUserId ? `${PROFILE_KEY_BASE}:${boundUserId}` : PROFILE_KEY_BASE
}

export function bindUserProfileUser(userId: string | null): void {
  boundUserId = userId
}

export function getUserProfile(): UserProfile {
  try {
    const raw = kvGet(getProfileKey())
    if (!raw) return emptyUserProfile()
    return { ...emptyUserProfile(), ...JSON.parse(raw) as UserProfile }
  } catch {
    return emptyUserProfile()
  }
}

export function saveUserProfile(profile: UserProfile): void {
  kvSet(getProfileKey(), JSON.stringify(profile))
}

export function clearUserProfile(): void {
  kvRemove(getProfileKey())
}

export function isOnboardingComplete(): boolean {
  return getUserProfile().onboardingComplete
}
