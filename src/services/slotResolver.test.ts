import { describe, expect, it } from 'vitest'
import { resolveDefaultExercises, resolveFromPool, canBenchPress } from './slotResolver'

describe('resolveDefaultExercises', () => {
  it('matches classic Full Body main lifts', () => {
    expect(resolveDefaultExercises('full_body').map((e) => e.catalogExerciseId)).toEqual([
      'barbell_back_squat',
      'barbell_bench_press',
      'pull_ups',
      'barbell_romanian_deadlift',
      'overhead_press',
      'chest_supported_row',
    ])
  })

  it('matches classic Push catalog ids and slot ids', () => {
    const push = resolveDefaultExercises('push')
    expect(push.map((e) => e.id)).toEqual([
      'push-1',
      'push-2',
      'push-3',
      'push-4',
      'push-5',
      'push-6',
      'push-7',
      'push-8',
      'push-9',
      'push-10',
    ])
    expect(push.map((e) => e.catalogExerciseId)).toEqual([
      'barbell_bench_press',
      'dumbbell_pullover',
      'overhead_press',
      'inclined_barbell_press',
      'lateral_raises',
      'atomic_push_up',
      'overhead_db_tricep_extension',
      'trx_tricep_extension',
      'close_grip_push_ups',
      'trx_pike',
    ])
  })
})

describe('resolveFromPool', () => {
  it('prefers pull_ups when pullup equipment is present', () => {
    const id = resolveFromPool({
      slotType: 'pattern',
      movementPattern: 'vertical_pull',
      loadTier: 'heavy',
      profile: { equipment: ['pullup', 'trx'], canBench: null },
      preferredCatalogIds: ['pull_ups', 'trx_assisted_pull_up'],
      fallbackCatalogId: 'trx_rows',
    })
    expect(id).toBe('pull_ups')
  })

  it('falls back to assisted pull when no bar', () => {
    const id = resolveFromPool({
      slotType: 'pattern',
      movementPattern: 'vertical_pull',
      loadTier: 'heavy',
      profile: { equipment: ['trx'], canBench: null },
      preferredCatalogIds: ['pull_ups', 'trx_assisted_pull_up', 'trx_kneeling_lat_pulldown'],
      fallbackCatalogId: 'trx_rows',
    })
    expect(id).toBe('trx_assisted_pull_up')
  })
})

describe('canBenchPress', () => {
  it('requires rack or explicit canBench', () => {
    expect(canBenchPress({ equipment: ['barbell', 'bench', 'rack'], canBench: null })).toBe(true)
    expect(canBenchPress({ equipment: ['barbell', 'bench'], canBench: true })).toBe(true)
    expect(canBenchPress({ equipment: ['barbell', 'bench'], canBench: false })).toBe(false)
  })
})
