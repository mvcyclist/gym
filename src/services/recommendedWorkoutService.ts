/**
 * Build a one-off recommended Exercise[] from check-in + template slots.
 */
import {
  getCatalogExerciseById,
  getExercisesByPattern,
  type CatalogExercise,
  type LoadTier,
  type MovementPattern,
} from '../data/exerciseCatalog'
import { getTemplateSlots } from '../data/workoutTemplateSlots'
import type { CheckIn, VolumeTier } from '../types/checkIn'
import type { TemplateSlot } from '../types/templateSlot'
import type { Exercise, WorkoutCategory } from '../types/workout'
import { getProgramType, type UserProfile } from '../types/userProfile'
import {
  isSkipCheckIn,
  resolveLoadTier,
  resolveVolumeTier,
  sessionVolumeSummary,
  VOLUME_SET_COUNT,
} from './checkInService'
import {
  exerciseFromCatalogId,
  matchesEquipment,
  type EquipmentProfile,
} from './slotResolver'
import { getUserProfile } from './userProfileRepository'

const LOAD_TIER_SOFTEN: LoadTier[] = ['heavy', 'moderate', 'low_impact']

export interface RecommendedExerciseMeta {
  loadTier: LoadTier | null
  volumeTier: VolumeTier
}

export interface RecommendedWorkout {
  category: WorkoutCategory
  title: string
  subtitle: string
  exercises: Exercise[]
  metaByExerciseId: Record<string, RecommendedExerciseMeta>
}

function pickFromTierPool(
  pattern: Exclude<MovementPattern, 'accessory'>,
  loadTier: LoadTier,
  profile: EquipmentProfile,
  preferredId?: string,
): CatalogExercise | undefined {
  const tryTier = (tier: LoadTier): CatalogExercise | undefined => {
    const pool = getExercisesByPattern(pattern, tier).filter((item) =>
      matchesEquipment(item, profile),
    )
    if (preferredId) {
      const preferred = pool.find((item) => item.id === preferredId)
      if (preferred) return preferred
    }
    return pool[0]
  }

  const exact = tryTier(loadTier)
  if (exact) return exact

  const start = LOAD_TIER_SOFTEN.indexOf(loadTier)
  for (let i = start + 1; i < LOAD_TIER_SOFTEN.length; i += 1) {
    const fallback = tryTier(LOAD_TIER_SOFTEN[i])
    if (fallback) return fallback
  }
  for (let i = start - 1; i >= 0; i -= 1) {
    const fallback = tryTier(LOAD_TIER_SOFTEN[i])
    if (fallback) return fallback
  }

  // Last resort: ignore equipment
  const any = getExercisesByPattern(pattern, loadTier)
  if (preferredId) {
    const preferred = any.find((item) => item.id === preferredId)
    if (preferred) return preferred
  }
  return any[0] ?? getCatalogExerciseById(preferredId ?? '')
}

function applyVolumeSets(templateSets: string, volumeTier: VolumeTier): string {
  const parsed = parseInt(templateSets, 10)
  const base = Number.isNaN(parsed) || parsed < 1 ? 3 : parsed
  return String(VOLUME_SET_COUNT[volumeTier](base))
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

  const loadTier = resolveLoadTier(slot.movementPattern, checkIn.regions)
  const volumeTier = resolveVolumeTier(slot.movementPattern, checkIn.global, checkIn.regions)
  const picked = pickFromTierPool(
    slot.movementPattern,
    loadTier,
    profile,
    slot.defaultCatalogExerciseId,
  )
  if (!picked) return null

  const exercise = exerciseFromCatalogId(category, index, picked.id, {
    ...slot,
    sets: applyVolumeSets(slot.sets, volumeTier),
  })

  return {
    exercise,
    meta: { loadTier, volumeTier },
  }
}

function resolveAccessorySlot(
  slot: TemplateSlot,
  checkIn: CheckIn,
  category: WorkoutCategory,
  index: number,
): { exercise: Exercise; meta: RecommendedExerciseMeta } {
  const volumeTier =
    checkIn.global === 'skip'
      ? 'minimal'
      : resolveVolumeTier('accessory', checkIn.global, checkIn.regions)

  const exercise = exerciseFromCatalogId(category, index, slot.defaultCatalogExerciseId, {
    ...slot,
    sets: applyVolumeSets(slot.sets, volumeTier),
  })

  return {
    exercise,
    meta: { loadTier: null, volumeTier },
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
