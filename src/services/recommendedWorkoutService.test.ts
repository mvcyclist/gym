import { describe, expect, it } from 'vitest'
import { emptyCheckInRegions } from '../types/checkIn'
import { emptyUserProfile } from '../types/userProfile'
import { buildRecommendedWorkout } from './recommendedWorkoutService'

describe('buildRecommendedWorkout', () => {
  it('builds six Full Body pattern lifts when feeling good', () => {
    const workout = buildRecommendedWorkout(
      { global: 'good', regions: emptyCheckInRegions() },
      'full_body',
      {
        ...emptyUserProfile(),
        onboardingComplete: true,
        equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'pullup'],
        canBench: true,
        programType: 'full_body',
      },
    )

    expect(workout).not.toBeNull()
    expect(workout!.exercises).toHaveLength(6)
    expect(workout!.subtitle).toMatch(/full volume/i)
    expect(workout!.exercises.every((e) => workout!.metaByExerciseId[e.id]?.loadTier === 'heavy')).toBe(true)
  })

  it('swaps squat to low_impact when knees are achy', () => {
    const workout = buildRecommendedWorkout(
      {
        global: 'good',
        regions: { ...emptyCheckInRegions(), knees: 'achy' },
      },
      'full_body',
      {
        ...emptyUserProfile(),
        onboardingComplete: true,
        equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'pullup', 'trx'],
        canBench: true,
        programType: 'full_body',
      },
    )

    expect(workout).not.toBeNull()
    const squat = workout!.exercises[0]
    expect(workout!.metaByExerciseId[squat.id]?.loadTier).toBe('low_impact')
    expect(squat.catalogExerciseId).not.toBe('barbell_back_squat')
  })

  it('returns null for skip', () => {
    expect(
      buildRecommendedWorkout(
        { global: 'skip', regions: emptyCheckInRegions() },
        'full_body',
      ),
    ).toBeNull()
  })
})
