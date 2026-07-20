import { describe, expect, it } from 'vitest'
import { getCatalogExerciseById } from './exerciseCatalog'
import {
  FULL_BODY_POOL_PRESETS,
  getFullBodyPoolPresetExercises,
  type FullBodyPoolPresetId,
} from './fullBodyPoolPresets'

const EXPECTED_CATALOG_IDS: Record<FullBodyPoolPresetId, string[]> = {
  heavy: [
    'barbell_back_squat',
    'barbell_bench_press',
    'pull_ups',
    'barbell_romanian_deadlift',
    'overhead_press',
    'chest_supported_row',
  ],
  moderate: [
    'goblet_squat',
    'dumbbell_flat_press',
    'pull_ups',
    'dumbbell_romanian_deadlift',
    'seated_dumbbell_shoulder_press',
    'single_dumbbell_arm_rows',
  ],
  trx: [
    'trx_assisted_squat',
    'trx_chest_press',
    'trx_kneeling_lat_pulldown',
    'trx_hip_press',
    'trx_pike',
    'trx_rows',
  ],
}

const PATTERNS = [
  'squat',
  'horizontal_push',
  'vertical_pull',
  'hinge',
  'vertical_push',
  'horizontal_pull',
] as const

describe('fullBodyPoolPresets', () => {
  it('exposes heavy, moderate, and trx presets', () => {
    expect(FULL_BODY_POOL_PRESETS.map((p) => p.id)).toEqual(['heavy', 'moderate', 'trx'])
  })

  for (const presetId of Object.keys(EXPECTED_CATALOG_IDS) as FullBodyPoolPresetId[]) {
    it(`${presetId} returns six exercises covering all movement patterns`, () => {
      const exercises = getFullBodyPoolPresetExercises(presetId)
      expect(exercises).toHaveLength(6)
      expect(exercises.map((e) => e.catalogExerciseId)).toEqual(EXPECTED_CATALOG_IDS[presetId])
      expect(exercises.map((e) => e.id)).toEqual([
        'full_body-1',
        'full_body-2',
        'full_body-3',
        'full_body-4',
        'full_body-5',
        'full_body-6',
      ])

      for (let i = 0; i < exercises.length; i++) {
        const catalog = getCatalogExerciseById(exercises[i].catalogExerciseId!)
        expect(catalog).toBeDefined()
        expect(catalog!.movementPattern).toBe(PATTERNS[i])
      }
    })
  }
})
