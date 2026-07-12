import type { UserPalette, WorkoutType } from '../types/training'
import { DEFAULT_PALETTE } from '../types/training'
import { getProgramType, type UserProfile } from '../types/userProfile'
import { cardioTypesFromProfile } from './weeklyPlanFromProfile'

const PPL_STRENGTH_TYPES: WorkoutType[] = ['Push', 'Pull', 'Leg', 'Core']

/**
 * Derive recommendation palette from onboarding profile.
 * PPL: Push/Pull/Leg/Core + cardio + Rest.
 * Full body: Full Body + cardio + Rest (core/mobility are in-session).
 */
export function paletteFromProfile(profile: UserProfile | null): UserPalette {
  if (!profile?.onboardingComplete) {
    return DEFAULT_PALETTE
  }

  const strengthTypes: WorkoutType[] =
    getProgramType(profile) === 'full_body' ? ['Full Body'] : [...PPL_STRENGTH_TYPES]

  const types: WorkoutType[] = [...strengthTypes]

  for (const cardio of cardioTypesFromProfile(profile)) {
    if (!types.includes(cardio as WorkoutType)) {
      types.push(cardio as WorkoutType)
    }
  }

  if (getProgramType(profile) === 'ppl' && profile.wantsMobility && !types.includes('Mobility')) {
    types.push('Mobility')
  }

  if (!types.includes('Rest')) {
    types.push('Rest')
  }

  return { types }
}
