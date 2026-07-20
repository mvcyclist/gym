import { describe, expect, it } from 'vitest'
import { emptyCheckInRegions } from '../types/checkIn'
import { emptyUserProfile } from '../types/userProfile'
import {
  buildRecommendedWorkout,
  buildSlotOptions,
} from './recommendedWorkoutService'
import type { EquipmentProfile } from './slotResolver'

const fullGearProfile = {
  ...emptyUserProfile(),
  onboardingComplete: true,
  equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'pullup', 'trx'] as const,
  canBench: true,
  programType: 'full_body' as const,
}

describe('buildRecommendedWorkout binary model', () => {
  it('builds six Full Body pattern lifts at heavy when 100%', () => {
    const workout = buildRecommendedWorkout(
      { global: '100', regions: emptyCheckInRegions() },
      'full_body',
      { ...fullGearProfile, equipment: [...fullGearProfile.equipment] },
    )

    expect(workout).not.toBeNull()
    expect(workout!.exercises).toHaveLength(6)
    expect(workout!.subtitle).toMatch(/100%/)
    expect(
      workout!.exercises.every((e) => workout!.metaByExerciseId[e.id]?.loadTier === 'heavy'),
    ).toBe(true)
    expect(workout!.exercises.every((e) => e.sets === '2')).toBe(true)
    expect(workout!.exercises[0].catalogExerciseId).toBe('barbell_back_squat')
  })

  it('vague not_100 dials every pattern to moderate with 1 set', () => {
    const workout = buildRecommendedWorkout(
      { global: 'not_100', regions: emptyCheckInRegions() },
      'full_body',
      { ...fullGearProfile, equipment: [...fullGearProfile.equipment] },
    )

    expect(workout).not.toBeNull()
    expect(workout!.subtitle).toMatch(/nothing specific/i)
    for (const exercise of workout!.exercises) {
      const meta = workout!.metaByExerciseId[exercise.id]
      expect(exercise.sets).toBe('1')
      expect(meta?.options?.some((g) => g.tier === 'heavy')).toBeFalsy()
      // Soften may land on low_impact if moderate empty for that pattern
      expect(meta?.loadTier === 'moderate' || meta?.loadTier === 'low_impact').toBe(true)
    }
  })

  it('knees bothering → squat low_impact, others heavy, full sets', () => {
    const workout = buildRecommendedWorkout(
      {
        global: 'not_100',
        regions: { ...emptyCheckInRegions(), knees: 'bothering' },
      },
      'full_body',
      { ...fullGearProfile, equipment: [...fullGearProfile.equipment] },
    )

    expect(workout).not.toBeNull()
    const squat = workout!.exercises[0]
    expect(workout!.metaByExerciseId[squat.id]?.loadTier).toBe('low_impact')
    expect(squat.catalogExerciseId).not.toBe('barbell_back_squat')
    expect(squat.sets).toBe('2')

    for (const exercise of workout!.exercises.slice(1)) {
      expect(workout!.metaByExerciseId[exercise.id]?.loadTier).toBe('heavy')
      expect(exercise.sets).toBe('2')
    }
  })

  it('accessories keep default catalog id and only change sets', () => {
    const vague = buildRecommendedWorkout(
      { global: 'not_100', regions: emptyCheckInRegions() },
      'push',
      {
        ...emptyUserProfile(),
        onboardingComplete: true,
        equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'pullup', 'trx'],
        canBench: true,
        programType: 'ppl',
      },
    )
    expect(vague).not.toBeNull()

    const accessories = vague!.exercises.filter(
      (e) => vague!.metaByExerciseId[e.id]?.loadTier === null,
    )
    expect(accessories.length).toBeGreaterThan(0)
    for (const accessory of accessories) {
      expect(accessory.sets).toBe('1')
      expect(vague!.metaByExerciseId[accessory.id]?.options).toBeUndefined()
    }

    const specific = buildRecommendedWorkout(
      {
        global: 'not_100',
        regions: { ...emptyCheckInRegions(), front_shoulder: 'bothering' },
      },
      'push',
      {
        ...emptyUserProfile(),
        onboardingComplete: true,
        equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'pullup', 'trx'],
        canBench: true,
        programType: 'ppl',
      },
    )
    const accessoryIdsVague = accessories.map((a) => a.catalogExerciseId).sort()
    const accessoryIdsSpecific = specific!
      .exercises.filter((e) => specific!.metaByExerciseId[e.id]?.loadTier === null)
      .map((a) => a.catalogExerciseId)
      .sort()
    expect(accessoryIdsSpecific).toEqual(accessoryIdsVague)
    for (const accessory of specific!.exercises.filter(
      (e) => specific!.metaByExerciseId[e.id]?.loadTier === null,
    )) {
      expect(accessory.sets).not.toBe('1')
    }
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

describe('buildSlotOptions', () => {
  const profile: EquipmentProfile = {
    equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'pullup', 'trx'],
    canBench: true,
  }

  it('prefers defaultCatalogExerciseId when still in the allowed pool', () => {
    const { selected, groups } = buildSlotOptions(
      'squat',
      'heavy',
      profile,
      'barbell_back_squat',
    )
    expect(selected?.id).toBe('barbell_back_squat')
    expect(groups.map((g) => g.tier)).toEqual(['heavy', 'moderate', 'low_impact'].filter((tier) =>
      groups.some((g) => g.tier === tier),
    ))
    expect(groups[0].tier).toBe('heavy')
  })

  it('never includes a less-conservative tier than resolved', () => {
    const { groups } = buildSlotOptions('squat', 'moderate', profile, 'barbell_back_squat')
    expect(groups.every((g) => g.tier !== 'heavy')).toBe(true)
    expect(groups.some((g) => g.tier === 'moderate' || g.tier === 'low_impact')).toBe(true)
    // Preferred heavy default must not win when outside allowed pool
    const flat = groups.flatMap((g) => g.exercises)
    expect(flat.some((e) => e.id === 'barbell_back_squat')).toBe(false)
  })

  it('softens empty moderate into low_impact options only', () => {
    // vertical_pull moderate is thin; with trx+pullup, low_impact should still appear if moderate empty
    const { groups, selected } = buildSlotOptions('vertical_pull', 'moderate', {
      equipment: ['trx'],
      canBench: false,
    })
    expect(groups.every((g) => g.tier !== 'heavy')).toBe(true)
    expect(selected).toBeDefined()
    if (groups[0]?.tier === 'low_impact') {
      expect(groups.every((g) => g.tier === 'low_impact')).toBe(true)
    }
  })
})
