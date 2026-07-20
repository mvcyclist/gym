/**
 * Build a one-off recommended Exercise[] from check-in + template slots.
 * See docs/21-checkin-binary-model.md.
 */
import {
  getCatalogExerciseById,
  getExercisesByPattern,
  type CatalogExercise,
  type LoadTier,
  type MovementPattern,
} from '../data/exerciseCatalog'
import { getTemplateSlots } from '../data/workoutTemplateSlots'
import type { CheckIn } from '../types/checkIn'
import type { TemplateSlot } from '../types/templateSlot'
import type { Exercise, WorkoutCategory } from '../types/workout'
import { getProgramType, type UserProfile } from '../types/userProfile'
import {
  allowedOverrideTiers,
  isSkipCheckIn,
  parseTemplateSets,
  resolveLoadTier,
  resolveSets,
  sessionVolumeSummary,
} from './checkInService'
import {
  exerciseFromCatalogId,
  matchesEquipment,
  type EquipmentProfile,
} from './slotResolver'
import { getUserProfile } from './userProfileRepository'

export interface TierOptionGroup {
  tier: LoadTier
  exercises: CatalogExercise[]
}

export interface RecommendedExerciseMeta {
  loadTier: LoadTier | null
  /** Pattern slots only — tier-grouped options for the override dropdown. */
  options?: TierOptionGroup[]
}

export interface RecommendedWorkout {
  category: WorkoutCategory
  title: string
  subtitle: string
  exercises: Exercise[]
  metaByExerciseId: Record<string, RecommendedExerciseMeta>
}

function poolForTier(
  pattern: Exclude<MovementPattern, 'accessory'>,
  tier: LoadTier,
  profile: EquipmentProfile,
): CatalogExercise[] {
  return getExercisesByPattern(pattern, tier).filter((item) => matchesEquipment(item, profile))
}

/**
 * Build dropdown groups for a resolved tier: that tier and more conservative only.
 * Empty tiers after equipment filter are omitted; if the resolved tier is empty,
 * soften downward so options start at the next non-empty conservative tier.
 * Never includes a less-conservative tier than resolved.
 */
export function buildSlotOptions(
  pattern: Exclude<MovementPattern, 'accessory'>,
  resolvedTier: LoadTier,
  profile: EquipmentProfile,
  preferredId?: string,
): { groups: TierOptionGroup[]; selected: CatalogExercise | undefined } {
  const allowed = allowedOverrideTiers(resolvedTier)
  const pools = allowed.map((tier) => ({
    tier,
    exercises: poolForTier(pattern, tier, profile),
  }))

  // Soften-down: drop leading empty tiers so the dropdown starts at first non-empty allowed tier.
  let start = 0
  while (start < pools.length && pools[start].exercises.length === 0) {
    start += 1
  }
  const groups = pools.slice(start).filter((group) => group.exercises.length > 0)

  if (groups.length === 0) {
    return { groups: [], selected: undefined }
  }

  // Prefer default only when it still sits in the effective resolved tier (groups[0]).
  // Softer preferred IDs must not pull a "heavy" resolve down to moderate.
  if (preferredId) {
    const inResolvedTier = groups[0].exercises.find((item) => item.id === preferredId)
    if (inResolvedTier) return { groups, selected: inResolvedTier }
  }

  return { groups, selected: groups[0].exercises[0] }
}

function resolvePatternSlot(
  slot: TemplateSlot,
  checkIn: CheckIn,
  profile: EquipmentProfile,
  category: WorkoutCategory,
  index: number,
): { exercise: Exercise; meta: RecommendedExerciseMeta } | null {
  if (slot.slotType !== 'pattern' || !slot.movementPattern || slot.movementPattern === 'accessory') {
    return null
  }
  if (checkIn.global === 'skip') return null

  const loadTier = resolveLoadTier(slot.movementPattern, checkIn)
  const { groups, selected } = buildSlotOptions(
    slot.movementPattern,
    loadTier,
    profile,
    slot.defaultCatalogExerciseId,
  )
  if (!selected) return null

  const sets = String(resolveSets(checkIn, parseTemplateSets(slot.sets)))
  const exercise = exerciseFromCatalogId(category, index, selected.id, {
    ...slot,
    sets,
  })

  // Effective badge tier = selected exercise's catalog tier (may be softer than resolved).
  const selectedTier = selected.loadTier ?? loadTier

  return {
    exercise,
    meta: {
      loadTier: selectedTier,
      options: groups,
    },
  }
}

/**
 * Accessories: set-count only. Never call resolveLoadTier.
 * Always use defaultCatalogExerciseId — no tier swap, no dropdown.
 */
function resolveAccessorySlot(
  slot: TemplateSlot,
  checkIn: CheckIn,
  category: WorkoutCategory,
  index: number,
): { exercise: Exercise; meta: RecommendedExerciseMeta } {
  const sets = String(resolveSets(checkIn, parseTemplateSets(slot.sets)))
  const exercise = exerciseFromCatalogId(category, index, slot.defaultCatalogExerciseId, {
    ...slot,
    sets,
  })

  return {
    exercise,
    meta: { loadTier: null },
  }
}

export function resolveRecommendedCategory(
  profile: UserProfile = getUserProfile(),
  scheduledStrength?: WorkoutCategory | null,
): WorkoutCategory {
  if (getProgramType(profile) === 'full_body') return 'full_body'
  if (scheduledStrength === 'push' || scheduledStrength === 'pull' || scheduledStrength === 'leg') {
    return scheduledStrength
  }
  return 'push'
}

export function buildRecommendedWorkout(
  checkIn: CheckIn,
  category: WorkoutCategory,
  profile: UserProfile = getUserProfile(),
): RecommendedWorkout | null {
  if (isSkipCheckIn(checkIn)) return null

  const equipmentProfile: EquipmentProfile = {
    equipment: profile.equipment,
    canBench: profile.canBench,
  }

  const slots = getTemplateSlots(category)
  const exercises: Exercise[] = []
  const metaByExerciseId: Record<string, RecommendedExerciseMeta> = {}

  slots.forEach((slot, index) => {
    if (slot.slotType === 'pattern') {
      const resolved = resolvePatternSlot(slot, checkIn, equipmentProfile, category, index)
      if (!resolved) return
      exercises.push(resolved.exercise)
      metaByExerciseId[resolved.exercise.id] = resolved.meta
      return
    }

    // Explicit accessory branch — never reaches resolveLoadTier.
    // Full Body recommended = main lifts only (guided segments stay separate).
    if (category === 'full_body') return

    const resolved = resolveAccessorySlot(slot, checkIn, category, index)
    exercises.push(resolved.exercise)
    metaByExerciseId[resolved.exercise.id] = resolved.meta
  })

  if (exercises.length === 0) return null

  const titles: Record<WorkoutCategory, string> = {
    push: 'Push',
    pull: 'Pull',
    leg: 'Leg',
    core: 'Core',
    full_body: 'Full Body',
  }

  return {
    category,
    title: titles[category],
    subtitle: sessionVolumeSummary(checkIn),
    exercises,
    metaByExerciseId,
  }
}

export function getCatalogTier(catalogId: string): LoadTier | null {
  return getCatalogExerciseById(catalogId)?.loadTier ?? null
}
