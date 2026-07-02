import { getSupabase } from '../lib/supabase'
import { emptyUserProfile, type UserProfile } from '../types/userProfile'

interface UserProfileRow {
  user_id: string
  profile: UserProfile
  updated_at: string
}

export interface CloudUserProfile {
  profile: UserProfile
  updatedAt: string
}

function parseProfileRow(row: UserProfileRow): CloudUserProfile {
  return {
    profile: { ...emptyUserProfile(), ...row.profile },
    updatedAt: row.updated_at,
  }
}

/** Strip transient in-memory-only fields before cloud persistence. */
export function profileForCloud(profile: UserProfile): UserProfile {
  const { editRoutineSnapshot, ...rest } = profile
  void editRoutineSnapshot
  return rest
}

export async function fetchProfileFromCloud(userId: string): Promise<CloudUserProfile | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, profile, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[sync] could not fetch user profile:', error.message)
    return null
  }

  if (!data) return null
  return parseProfileRow(data as UserProfileRow)
}

export async function upsertProfileToCloud(
  userId: string,
  profile: UserProfile,
  updatedAt: string,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      profile: profileForCloud(profile),
      updated_at: updatedAt,
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
}
