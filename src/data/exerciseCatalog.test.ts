import { describe, expect, it } from 'vitest'
import {
  exerciseCatalog,
  getCatalogExerciseById,
  getExercisesByAccessoryGroup,
  getExercisesByPattern,
} from './exerciseCatalog'

describe('exerciseCatalog Phase 1', () => {
  it('has unique ids', () => {
    const ids = exerciseCatalog.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('tags every row with pattern + loadTier or accessoryGroup', () => {
    for (const exercise of exerciseCatalog) {
      expect(exercise.movementPattern).toBeTruthy()
      if (exercise.movementPattern === 'accessory') {
        expect(exercise.accessoryGroup).toBeTruthy()
        expect(exercise.loadTier).toBeUndefined()
      } else {
        expect(exercise.loadTier).toBeTruthy()
        expect(exercise.accessoryGroup).toBeUndefined()
      }
    }
  })

  it('keeps locked Decision A / K ids', () => {
    expect(getCatalogExerciseById('pull_ups')).toMatchObject({
      movementPattern: 'vertical_pull',
      loadTier: 'heavy',
      difficulty: 'advanced',
    })
    expect(getCatalogExerciseById('trx_pike')).toMatchObject({
      movementPattern: 'vertical_push',
      loadTier: 'low_impact',
      difficulty: 'advanced',
    })
    expect(getCatalogExerciseById('dumbbell_pullover')).toMatchObject({
      movementPattern: 'accessory',
      accessoryGroup: 'lats',
    })
    expect(getCatalogExerciseById('trx_face_pull')).toMatchObject({
      movementPattern: 'accessory',
      accessoryGroup: 'rear_delt',
    })
    expect(getCatalogExerciseById('trx_y_fly')).toMatchObject({
      movementPattern: 'accessory',
      accessoryGroup: 'rear_delt',
    })
    expect(getCatalogExerciseById('trx_rollout_press')).toMatchObject({
      movementPattern: 'accessory',
      accessoryGroup: 'core',
    })
  })

  it('excludes guided segments from pool helpers', () => {
    expect(getExercisesByAccessoryGroup('core').map((e) => e.id)).not.toContain('core_segment')
    expect(getExercisesByAccessoryGroup('mobility').map((e) => e.id)).not.toContain('warmup_segment')
    expect(getExercisesByAccessoryGroup('mobility').map((e) => e.id)).not.toContain('mobility_segment')
  })

  it('filters by pattern and load tier', () => {
    const heavySquats = getExercisesByPattern('squat', 'heavy')
    expect(heavySquats.every((e) => e.movementPattern === 'squat' && e.loadTier === 'heavy')).toBe(true)
    expect(heavySquats.map((e) => e.id)).toContain('barbell_back_squat')
    expect(heavySquats.map((e) => e.id)).not.toContain('bodyweight_squat')

    const lowImpactPull = getExercisesByPattern('vertical_pull', 'low_impact')
    expect(lowImpactPull.map((e) => e.id)).toContain('trx_assisted_pull_up')
    expect(lowImpactPull.map((e) => e.id)).not.toContain('pull_ups')
  })

  it('includes matrix coverage for each primary pattern', () => {
    const patterns = [
      'squat',
      'hinge',
      'horizontal_push',
      'horizontal_pull',
      'vertical_push',
      'vertical_pull',
    ] as const
    for (const pattern of patterns) {
      expect(getExercisesByPattern(pattern).length).toBeGreaterThan(0)
      expect(getExercisesByPattern(pattern, 'heavy').length + getExercisesByPattern(pattern, 'low_impact').length).toBeGreaterThan(0)
    }
  })
})
