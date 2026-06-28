import type { UserPalette, WorkoutType } from '../types/training'
import { DEFAULT_PALETTE } from '../types/training'
import type { UserProfile } from '../types/userProfile'
import { cardioTypesFromProfile } from './weeklyPlanFromProfile'

const STRENGTH_TYPES: WorkoutType[] = ['Push', 'Pull', 'Leg', 'Core']

/**
 * Derive recommendation palette from onboarding profile.
 * Strength types always included; cardio from user selection; mobility optional.
 */
export function paletteFromProfile(profile: UserProfile | null): UserPalette {
  if (!profile?.onboardingComplete) {
    return DEFAULT_PALETTE
  }

  const types: WorkoutType[] = [...STRENGTH_TYPES]

  for (const cardio of cardioTypesFromProfile(profile)) {
    if (!types.includes(cardio as WorkoutType)) {
      types.push(cardio as WorkoutType)
    }
  }

  if (profile.wantsMobility && !types.includes('Mobility')) {
    types.push('Mobility')
  }

  if (!types.includes('Rest')) {
    types.push('Rest')
  }

  return { types }
}
