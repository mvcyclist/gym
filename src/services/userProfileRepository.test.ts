import { describe, expect, it } from 'vitest'
import { profileForCloud } from '../adapters/supabaseProfileStorage'
import { emptyUserProfile } from '../types/userProfile'
import { isProfileEmpty, mergeProfiles } from './userProfileRepository'

describe('isProfileEmpty', () => {
  it('treats default profile as empty', () => {
    expect(isProfileEmpty(emptyUserProfile())).toBe(true)
  })

  it('treats completed profile as non-empty', () => {
    expect(
      isProfileEmpty({
        ...emptyUserProfile(),
        onboardingComplete: true,
        equipment: ['barbell'],
      }),
    ).toBe(false)
  })
})

describe('mergeProfiles', () => {
  const localComplete = {
    ...emptyUserProfile(),
    onboardingComplete: true,
    equipment: ['dumbbells' as const],
  }

  const cloudComplete = {
    ...emptyUserProfile(),
    onboardingComplete: true,
    equipment: ['barbell' as const],
  }

  it('prefers cloud when local is empty', () => {
    const merged = mergeProfiles(
      emptyUserProfile(),
      null,
      cloudComplete,
      '2026-01-02T00:00:00.000Z',
    )
    expect(merged.source).toBe('cloud')
    expect(merged.profile.equipment).toEqual(['barbell'])
  })

  it('keeps local when cloud is missing', () => {
    const merged = mergeProfiles(
      localComplete,
      '2026-01-02T00:00:00.000Z',
      null,
      null,
    )
    expect(merged.source).toBe('local')
    expect(merged.profile.equipment).toEqual(['dumbbells'])
  })

  it('prefers newer cloud profile', () => {
    const merged = mergeProfiles(
      localComplete,
      '2026-01-01T00:00:00.000Z',
      cloudComplete,
      '2026-01-02T00:00:00.000Z',
    )
    expect(merged.source).toBe('cloud')
    expect(merged.profile.equipment).toEqual(['barbell'])
  })

  it('prefers newer local profile', () => {
    const merged = mergeProfiles(
      localComplete,
      '2026-01-03T00:00:00.000Z',
      cloudComplete,
      '2026-01-02T00:00:00.000Z',
    )
    expect(merged.source).toBe('local')
    expect(merged.profile.equipment).toEqual(['dumbbells'])
  })
})

describe('profileForCloud', () => {
  it('strips edit routine snapshot before cloud persistence', () => {
    const stripped = profileForCloud({
      ...emptyUserProfile(),
      onboardingComplete: true,
      equipment: ['trx'],
      editRoutineSnapshot: {
        ...emptyUserProfile(),
        onboardingComplete: true,
        equipment: ['barbell'],
      },
    })

    expect(stripped.equipment).toEqual(['trx'])
    expect(stripped.editRoutineSnapshot).toBeUndefined()
  })
})
