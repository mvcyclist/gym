/**
 * Stub tags for Train-today tiles. Swap for real history-based logic later.
 */
import type { BuilderCategoryId } from '../data/workoutCategories'

export type CategoryTagType = 'recommended' | 'recently_covered' | 'fine_today' | 'info'

export interface CategoryTag {
  type: CategoryTagType
  label: string
  subtitle: string
}

const STUB_TAGS: Record<BuilderCategoryId, CategoryTag> = {
  full_body: {
    type: 'recommended',
    label: '✦ Recommended',
    subtitle: "Haven't hit it in 5 days",
  },
  push: {
    type: 'recently_covered',
    label: '◐ Recently covered',
    subtitle: "Overlaps with Wed's Full Body",
  },
  pull: {
    type: 'fine_today',
    label: '— Fine today',
    subtitle: 'Back, biceps, rear delts',
  },
  leg: {
    type: 'fine_today',
    label: '— Fine today',
    subtitle: 'Quads, hamstrings, glutes',
  },
  upper: {
    type: 'recently_covered',
    label: '◐ Recently covered',
    subtitle: "Overlaps with Wed's Full Body",
  },
  trx: {
    type: 'info',
    label: '◆ Always available',
    subtitle: 'Bodyweight, low impact',
  },
}

export function getCategoryTag(id: BuilderCategoryId): CategoryTag {
  return STUB_TAGS[id]
}
