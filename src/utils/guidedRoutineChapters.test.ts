import { describe, expect, it } from 'vitest'
import { FULL_BODY_CORE_V1 } from '../fixtures/guidedRoutines'
import {
  formatPlaybackClock,
  getChapterAtTime,
  getChapterIndexAtTime,
  getNextChapter,
  getRoutinePreview,
} from './guidedRoutineChapters'

describe('guidedRoutineChapters', () => {
  it('resolves chapter index from playback time', () => {
    const { chapters } = FULL_BODY_CORE_V1
    expect(getChapterIndexAtTime(chapters, 0)).toBe(0)
    expect(getChapterIndexAtTime(chapters, chapters[1].startSeconds)).toBe(1)
    expect(getChapterIndexAtTime(chapters, FULL_BODY_CORE_V1.durationSeconds)).toBe(chapters.length - 1)
  })

  it('returns current and next chapter titles', () => {
    const { chapters } = FULL_BODY_CORE_V1
    const mid = chapters[2].startSeconds + 1
    expect(getChapterAtTime(chapters, mid)?.id).toBe(chapters[2].id)
    expect(getNextChapter(chapters, mid)?.id).toBe(chapters[3].id)
  })

  it('builds preview items without intro or outro', () => {
    const preview = getRoutinePreview(FULL_BODY_CORE_V1)
    expect(preview.items).toContain('TRX Body Saw')
    expect(preview.items).toHaveLength(5)
    expect(preview.items).not.toContain('Introduction')
    expect(preview.items).not.toContain('Outro')
    expect(preview.items).not.toContain('Round 2')
  })

  it('formats playback clock', () => {
    expect(formatPlaybackClock(0)).toBe('0:00')
    expect(formatPlaybackClock(65)).toBe('1:05')
  })
})
