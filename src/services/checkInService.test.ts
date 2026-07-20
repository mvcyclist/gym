import { describe, expect, it } from 'vitest'
import { emptyCheckInRegions } from '../types/checkIn'
import type { CheckIn } from '../types/checkIn'
import {
  allowedOverrideTiers,
  resolveLoadTier,
  resolveSets,
  sessionVolumeSummary,
} from './checkInService'

const PATTERNS = [
  'squat',
  'hinge',
  'horizontal_push',
  'horizontal_pull',
  'vertical_push',
  'vertical_pull',
] as const

function checkIn(
  global: CheckIn['global'],
  regions: Partial<CheckIn['regions']> = {},
): CheckIn {
  return {
    global,
    regions: { ...emptyCheckInRegions(), ...regions },
  }
}

describe('resolveLoadTier / resolveSets binary matrix', () => {
  it('100% → heavy · template sets for every pattern', () => {
    const ci = checkIn('100')
    for (const pattern of PATTERNS) {
      expect(resolveLoadTier(pattern, ci)).toBe('heavy')
      expect(resolveSets(ci, 2)).toBe(2)
      expect(resolveSets(ci, 3)).toBe(3)
    }
  })

  it('vague not_100 → moderate · 1 set everywhere', () => {
    const ci = checkIn('not_100')
    for (const pattern of PATTERNS) {
      expect(resolveLoadTier(pattern, ci)).toBe('moderate')
    }
    expect(resolveSets(ci, 2)).toBe(1)
    expect(resolveSets(ci, 3)).toBe(1)
  })

  it('knees bothering → squat low_impact, others heavy, full sets', () => {
    const ci = checkIn('not_100', { knees: 'bothering' })
    expect(resolveLoadTier('squat', ci)).toBe('low_impact')
    expect(resolveLoadTier('hinge', ci)).toBe('heavy')
    expect(resolveLoadTier('horizontal_push', ci)).toBe('heavy')
    expect(resolveSets(ci, 2)).toBe(2)
  })

  it('front shoulder bothering → both push patterns low_impact', () => {
    const ci = checkIn('not_100', { front_shoulder: 'bothering' })
    expect(resolveLoadTier('horizontal_push', ci)).toBe('low_impact')
    expect(resolveLoadTier('vertical_push', ci)).toBe('low_impact')
    expect(resolveLoadTier('squat', ci)).toBe('heavy')
    expect(resolveLoadTier('horizontal_pull', ci)).toBe('heavy')
  })

  it('hips + upper back bothering fans out correctly', () => {
    const ci = checkIn('not_100', { hips: 'bothering', upper_back: 'bothering' })
    expect(resolveLoadTier('squat', ci)).toBe('low_impact')
    expect(resolveLoadTier('hinge', ci)).toBe('low_impact')
    expect(resolveLoadTier('horizontal_pull', ci)).toBe('low_impact')
    expect(resolveLoadTier('vertical_pull', ci)).toBe('low_impact')
    expect(resolveLoadTier('horizontal_push', ci)).toBe('heavy')
    expect(resolveLoadTier('vertical_push', ci)).toBe('heavy')
    expect(resolveSets(ci, 2)).toBe(2)
  })
})

describe('sessionVolumeSummary', () => {
  it('maps the three subtitle paths', () => {
    expect(sessionVolumeSummary(checkIn('100'))).toMatch(/100%/)
    expect(sessionVolumeSummary(checkIn('not_100'))).toMatch(/nothing specific/i)
    expect(
      sessionVolumeSummary(checkIn('not_100', { knees: 'bothering' })),
    ).toMatch(/named it/i)
  })
})

describe('allowedOverrideTiers', () => {
  it('only allows resolved tier and more conservative', () => {
    expect(allowedOverrideTiers('heavy')).toEqual(['heavy', 'moderate', 'low_impact'])
    expect(allowedOverrideTiers('moderate')).toEqual(['moderate', 'low_impact'])
    expect(allowedOverrideTiers('low_impact')).toEqual(['low_impact'])
  })
})
