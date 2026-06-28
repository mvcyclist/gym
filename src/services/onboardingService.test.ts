import { describe, expect, it, beforeEach, vi } from 'vitest'
import { emptyUserProfile, type UserProfile } from '../types/userProfile'

let memoryProfile: UserProfile = emptyUserProfile()

vi.mock('./userProfileRepository', () => ({
  getUserProfile: () => memoryProfile,
  saveUserProfile: (profile: UserProfile) => {
    memoryProfile = profile
  },
  clearUserProfile: () => {
    memoryProfile = emptyUserProfile()
  },
}))

import {
  cancelEditRoutine,
  isEditingRoutine,
  saveOnboardingDraft,
  startEditRoutine,
} from './onboardingService'

describe('startEditRoutine / cancelEditRoutine', () => {
  beforeEach(() => {
    memoryProfile = emptyUserProfile()
  })

  it('snapshots completed profile and opens edit mode', () => {
    memoryProfile = {
      ...emptyUserProfile(),
      onboardingComplete: true,
      equipment: ['barbell', 'rack'],
      cardioModalities: ['run'],
    }

    const editing = startEditRoutine()
    expect(editing.onboardingComplete).toBe(false)
    expect(editing.editRoutineSnapshot?.equipment).toEqual(['barbell', 'rack'])
    expect(isEditingRoutine(editing)).toBe(true)
  })

  it('cancel restores snapshot and clears incomplete edit', () => {
    memoryProfile = {
      ...emptyUserProfile(),
      onboardingComplete: true,
      equipment: ['dumbbells'],
    }
    startEditRoutine()

    memoryProfile = {
      ...memoryProfile,
      equipment: ['bodyweight'],
      onboardingDraft: { equipment: ['bodyweight'] },
      onboardingStep: 2,
    }

    const restored = cancelEditRoutine()
    expect(restored?.onboardingComplete).toBe(true)
    expect(restored?.equipment).toEqual(['dumbbells'])
    expect(restored?.onboardingDraft).toBeUndefined()
    expect(restored?.editRoutineSnapshot).toBeUndefined()
  })

  it('does not persist drafts while editing routine', () => {
    memoryProfile = {
      ...emptyUserProfile(),
      onboardingComplete: true,
      equipment: ['trx'],
    }
    startEditRoutine()

    saveOnboardingDraft({
      ...memoryProfile,
      equipment: ['bodyweight'],
      onboardingComplete: false,
      onboardingStep: 2,
      onboardingDraft: { equipment: ['bodyweight'] },
    })

    expect(memoryProfile.equipment).toEqual(['trx'])
    expect(memoryProfile.onboardingDraft).toBeUndefined()
  })

  it('still persists drafts for first-time onboarding', () => {
    saveOnboardingDraft({
      ...emptyUserProfile(),
      equipment: ['barbell'],
      onboardingComplete: false,
      onboardingStep: 2,
      onboardingDraft: { equipment: ['barbell'] },
    })

    expect(memoryProfile.onboardingDraft?.equipment).toEqual(['barbell'])
    expect(memoryProfile.onboardingStep).toBe(2)
  })
})
