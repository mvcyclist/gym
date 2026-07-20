import { describe, expect, it } from 'vitest'
import {
  BUILDER_CATEGORIES,
  getBuilderCategory,
  restSecondsForTier,
  toLedgerWorkoutCategory,
} from './workoutCategories'

describe('workoutCategories', () => {
  it('exposes six always-available builder categories', () => {
    expect(BUILDER_CATEGORIES.map((c) => c.id)).toEqual([
      'full_body',
      'push',
      'pull',
      'leg',
      'upper',
      'trx',
    ])
  })

  it('marks TRX Day as force low_impact and skip check-in', () => {
    const trx = getBuilderCategory('trx')
    expect(trx.forceTier).toBe('low_impact')
    expect(trx.skipCheckIn).toBe(true)
    expect(trx.patterns).toHaveLength(6)
  })

  it('maps upper and trx to full_body for the ledger', () => {
    expect(toLedgerWorkoutCategory('upper')).toBe('full_body')
    expect(toLedgerWorkoutCategory('trx')).toBe('full_body')
    expect(toLedgerWorkoutCategory('push')).toBe('push')
  })

  it('uses 180s rest for heavy/moderate and 60s for TRX', () => {
    expect(restSecondsForTier('heavy')).toBe(180)
    expect(restSecondsForTier('moderate')).toBe(180)
    expect(restSecondsForTier('low_impact')).toBe(60)
    expect(restSecondsForTier('heavy', true)).toBe(60)
  })
})
