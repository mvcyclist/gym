import { describe, expect, it } from 'vitest'
import { emptyCheckInRegions } from '../types/checkIn'
import { resolveLoadTier, resolveVolumeTier } from './checkInService'

describe('resolveLoadTier', () => {
  it('defaults to heavy when all fine', () => {
    expect(resolveLoadTier('squat', emptyCheckInRegions())).toBe('heavy')
  })

  it('uses moderate for stiff knees on squat', () => {
    const regions = { ...emptyCheckInRegions(), knees: 'stiff' as const }
    expect(resolveLoadTier('squat', regions)).toBe('moderate')
  })

  it('uses low_impact for achy knees on squat', () => {
    const regions = { ...emptyCheckInRegions(), knees: 'achy' as const }
    expect(resolveLoadTier('squat', regions)).toBe('low_impact')
  })

  it('ignores sore for load tier', () => {
    const regions = { ...emptyCheckInRegions(), knees: 'sore' as const }
    expect(resolveLoadTier('squat', regions)).toBe('heavy')
  })
})

describe('resolveVolumeTier', () => {
  it('maps global feeling to volume', () => {
    const regions = emptyCheckInRegions()
    expect(resolveVolumeTier('squat', 'good', regions)).toBe('full')
    expect(resolveVolumeTier('squat', 'meh', regions)).toBe('reduced')
    expect(resolveVolumeTier('squat', 'beat_up', regions)).toBe('minimal')
  })

  it('drops one tier further when region is sore', () => {
    const regions = { ...emptyCheckInRegions(), knees: 'sore' as const }
    expect(resolveVolumeTier('squat', 'good', regions)).toBe('reduced')
    expect(resolveVolumeTier('squat', 'meh', regions)).toBe('minimal')
  })
})
