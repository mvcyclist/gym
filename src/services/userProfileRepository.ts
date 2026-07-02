import { kvGet, kvSet, kvRemove } from '../adapters/localKeyValueStorage'
import {
  fetchProfileFromCloud,
  upsertProfileToCloud,
} from '../adapters/supabaseProfileStorage'
import { isSupabaseConfigured } from '../lib/supabase'
import { emptyUserProfile, type UserProfile } from '../types/userProfile'

const PROFILE_KEY_BASE = 'userProfile'
const PROFILE_UPDATED_AT_KEY_BASE = 'userProfileUpdatedAt'

let boundUserId: string | null = null

function getProfileKey(): string {
  return boundUserId ? `${PROFILE_KEY_BASE}:${boundUserId}` : PROFILE_KEY_BASE
}

function getProfileUpdatedAtKey(): string {
  return boundUserId
    ? `${PROFILE_UPDATED_AT_KEY_BASE}:${boundUserId}`
    : PROFILE_UPDATED_AT_KEY_BASE
}

export function bindUserProfileUser(userId: string | null): void {
  if (userId && userId !== boundUserId) {
    migrateLegacyGlobalProfile(userId)
  }
  boundUserId = userId
}

function migrateLegacyGlobalProfile(userId: string): void {
  const globalRaw = kvGet(PROFILE_KEY_BASE)
  if (!globalRaw) return
  const userKey = `${PROFILE_KEY_BASE}:${userId}`
  if (!kvGet(userKey)) {
    kvSet(userKey, globalRaw)
    const globalUpdatedAt = kvGet(PROFILE_UPDATED_AT_KEY_BASE)
    if (globalUpdatedAt) {
      kvSet(`${PROFILE_UPDATED_AT_KEY_BASE}:${userId}`, globalUpdatedAt)
    }
  }
}

function parseStoredProfile(raw: string): UserProfile {
  return { ...emptyUserProfile(), ...(JSON.parse(raw) as UserProfile) }
}

export function isProfileEmpty(profile: UserProfile): boolean {
  return !profile.onboardingComplete && profile.equipment.length === 0
}

export function getProfileUpdatedAt(): string | null {
  return kvGet(getProfileUpdatedAtKey())
}

export function getUserProfile(): UserProfile {
  try {
    const raw = kvGet(getProfileKey())
    if (!raw) return emptyUserProfile()
    return parseStoredProfile(raw)
  } catch {
    return emptyUserProfile()
  }
}

function saveUserProfileLocal(profile: UserProfile, updatedAt: string): void {
  kvSet(getProfileKey(), JSON.stringify(profile))
  kvSet(getProfileUpdatedAtKey(), updatedAt)
}

export function saveUserProfile(profile: UserProfile): void {
  const updatedAt = new Date().toISOString()
  saveUserProfileLocal(profile, updatedAt)

  if (boundUserId && isSupabaseConfigured()) {
    void pushProfileToCloud(boundUserId, profile, updatedAt)
  }
}

export async function pushProfileToCloud(
  userId: string,
  profile: UserProfile,
  updatedAt: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    await upsertProfileToCloud(userId, profile, updatedAt)
  } catch (error) {
    console.error('[profile] failed to push profile to cloud', error)
  }
}

export function mergeProfiles(
  local: UserProfile,
  localUpdatedAt: string | null,
  cloud: UserProfile | null,
  cloudUpdatedAt: string | null,
): { profile: UserProfile; updatedAt: string; source: 'local' | 'cloud' } {
  const now = new Date().toISOString()

  if (!cloud || !cloudUpdatedAt) {
    return {
      profile: local,
      updatedAt: localUpdatedAt ?? now,
      source: 'local',
    }
  }

  if (!localUpdatedAt || isProfileEmpty(local)) {
    return { profile: cloud, updatedAt: cloudUpdatedAt, source: 'cloud' }
  }

  const localTime = Date.parse(localUpdatedAt)
  const cloudTime = Date.parse(cloudUpdatedAt)

  if (cloudTime >= localTime) {
    return { profile: cloud, updatedAt: cloudUpdatedAt, source: 'cloud' }
  }

  return { profile: local, updatedAt: localUpdatedAt, source: 'local' }
}

export async function hydrateProfileFromCloud(userId: string): Promise<UserProfile> {
  const local = getUserProfile()
  const localUpdatedAt = getProfileUpdatedAt()

  let cloudProfile: UserProfile | null = null
  let cloudUpdatedAt: string | null = null
  try {
    const cloudResult = await fetchProfileFromCloud(userId)
    cloudProfile = cloudResult?.profile ?? null
    cloudUpdatedAt = cloudResult?.updatedAt ?? null
  } catch (error) {
    console.warn('[profile] failed to fetch profile from cloud', error)
    return local
  }

  const merged = mergeProfiles(local, localUpdatedAt, cloudProfile, cloudUpdatedAt)

  saveUserProfileLocal(merged.profile, merged.updatedAt)

  const shouldPushLocal =
    merged.source === 'local' &&
    !isProfileEmpty(merged.profile) &&
    (!cloudUpdatedAt || merged.updatedAt !== cloudUpdatedAt)

  if (shouldPushLocal) {
    await pushProfileToCloud(userId, merged.profile, merged.updatedAt)
  }

  return merged.profile
}

export function clearUserProfile(): void {
  kvRemove(getProfileKey())
  kvRemove(getProfileUpdatedAtKey())
}

export function isOnboardingComplete(): boolean {
  return getUserProfile().onboardingComplete
}
