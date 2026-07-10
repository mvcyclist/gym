import { describe, expect, it } from 'vitest'
import {
  daysSinceDateKey,
  formatLastWorkoutMeta,
  parseCalendarDateKey,
} from './activityHistory'

describe('parseCalendarDateKey', () => {
  it('parses YYYY-MM-DD', () => {
    const date = parseCalendarDateKey('2026-07-05')
    expect(date).not.toBeNull()
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(6)
    expect(date?.getDate()).toBe(5)
  })

  it('parses ISO timestamps without breaking', () => {
    const date = parseCalendarDateKey('2026-07-05T18:30:00.000Z')
    expect(date).not.toBeNull()
    expect(date?.getFullYear()).toBe(2026)
  })

  it('returns null for invalid keys', () => {
    expect(parseCalendarDateKey('NaN-NaN-NaN')).toBeNull()
    expect(parseCalendarDateKey('not-a-date')).toBeNull()
  })
})

describe('daysSinceDateKey', () => {
  const now = new Date(2026, 6, 9, 15, 0, 0, 0)

  it('returns 0 for same calendar day', () => {
    expect(daysSinceDateKey('2026-07-09', now)).toBe(0)
  })

  it('returns day count for prior dates', () => {
    expect(daysSinceDateKey('2026-07-05', now)).toBe(4)
    expect(daysSinceDateKey('2026-07-08', now)).toBe(1)
  })

  it('returns null for invalid dates', () => {
    expect(daysSinceDateKey('NaN-NaN-NaN', now)).toBeNull()
  })
})

describe('formatLastWorkoutMeta', () => {
  const now = new Date(2026, 6, 9, 15, 0, 0, 0)

  it('labels today and yesterday', () => {
    expect(formatLastWorkoutMeta('2026-07-09', now)).toBe('Today')
    expect(formatLastWorkoutMeta('2026-07-08', now)).toBe('Yesterday')
  })

  it('includes readable date and days ago', () => {
    expect(formatLastWorkoutMeta('2026-07-05', now)).toMatch(/Jul 5, 2026 · 4 days ago/)
  })
})
