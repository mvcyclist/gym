import type { GuidedRoutine, GuidedRoutineChapter } from '../types/guidedRoutine'

export function getChapterIndexAtTime(
  chapters: GuidedRoutineChapter[],
  currentTimeSeconds: number,
): number {
  if (chapters.length === 0) return -1

  const time = Math.max(0, currentTimeSeconds)
  for (let index = chapters.length - 1; index >= 0; index -= 1) {
    if (time >= chapters[index].startSeconds) return index
  }

  return 0
}

export function getChapterAtTime(
  chapters: GuidedRoutineChapter[],
  currentTimeSeconds: number,
): GuidedRoutineChapter | null {
  const index = getChapterIndexAtTime(chapters, currentTimeSeconds)
  return index >= 0 ? chapters[index] : null
}

export function getNextChapter(
  chapters: GuidedRoutineChapter[],
  currentTimeSeconds: number,
): GuidedRoutineChapter | null {
  const index = getChapterIndexAtTime(chapters, currentTimeSeconds)
  if (index < 0 || index >= chapters.length - 1) return null
  return chapters[index + 1]
}

const PREVIEW_SKIP_IDS = new Set(['intro', 'outro', 'round-two'])

function chapterPreviewLabel(title: string): string {
  return title.replace(/^Round \d+ — /, '')
}

export function getRoutinePreview(routine: GuidedRoutine): {
  subtitle: string
  items: string[]
} {
  const minutes = Math.max(1, Math.round(routine.durationSeconds / 60))
  const seen = new Set<string>()
  const items: string[] = []

  for (const chapter of routine.chapters) {
    if (PREVIEW_SKIP_IDS.has(chapter.id)) continue
    const label = chapterPreviewLabel(chapter.title)
    if (seen.has(label)) continue
    seen.add(label)
    items.push(label)
  }

  return {
    subtitle: `~${minutes} min · audio guided`,
    items,
  }
}

export function formatPlaybackClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
