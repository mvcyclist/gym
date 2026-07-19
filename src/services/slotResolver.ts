/**
 * Resolves TemplateSlots to catalog exercise IDs and Exercise objects.
 * Shared by classic defaults, equipment-aware generation, and later recommend/manual build.
 */
import {
  getCatalogExerciseById,
  getDefaultRestSeconds,
  getExercisesByAccessoryGroup,
  getExercisesByPattern,
  type CatalogExercise,
  type LoadTier,
  type MovementPattern,
  type AccessoryGroup,
} from '../data/exerciseCatalog'
import { getTemplateSlots } from '../data/workoutTemplateSlots'
import type { TemplateSlot } from '../types/templateSlot'
import type { EquipmentKey, UserProfile } from '../types/userProfile'
import type { Exercise, WorkoutCategory } from '../types/workout'

export type EquipmentProfile = Pick<UserProfile, 'equipment' | 'canBench'>

const LOAD_TIER_FALLBACK: LoadTier[] = ['heavy', 'moderate', 'low_impact']

export function hasEquipment(equipment: EquipmentKey[], key: EquipmentKey): boolean {
  return equipment.includes(key)
}

export function canBenchPress(profile: EquipmentProfile): boolean {
  const { equipment, canBench } = profile
  return (
    hasEquipment(equipment, 'barbell') &&
    hasEquipment(equipment, 'bench') &&
    (hasEquipment(equipment, 'rack') || canBench === true)
  )
}

/** Whether the user's gear satisfies catalog equipmentKeys (+ bench clarifier for flat bench). */
export function matchesEquipment(exercise: CatalogExercise, profile: EquipmentProfile): boolean {
  if (exercise.id === 'barbell_bench_press') {
    return canBenchPress(profile)
  }

  const keys = exercise.equipmentKeys ?? []
  if (keys.length === 0) return true
  return keys.every((key) => hasEquipment(profile.equipment, key))
}

function poolForSlot(slot: Pick<TemplateSlot, 'slotType' | 'movementPattern' | 'accessoryGroup' | 'loadTier'>): CatalogExercise[] {
  if (slot.slotType === 'accessory' && slot.accessoryGroup) {
    return getExercisesByAccessoryGroup(slot.accessoryGroup)
  }
  if (slot.slotType === 'pattern' && slot.movementPattern && slot.movementPattern !== 'accessory') {
    const preferredTier = slot.loadTier
      ? [slot.loadTier, ...LOAD_TIER_FALLBACK.filter((tier) => tier !== slot.loadTier)]
      : LOAD_TIER_FALLBACK
    const seen = new Set<string>()
    const ordered: CatalogExercise[] = []
    for (const tier of preferredTier) {
      for (const exercise of getExercisesByPattern(slot.movementPattern, tier)) {
        if (seen.has(exercise.id)) continue
        seen.add(exercise.id)
        ordered.push(exercise)
      }
    }
    // Also include any other tiers/pattern rows not covered above
    for (const exercise of getExercisesByPattern(slot.movementPattern)) {
      if (seen.has(exercise.id)) continue
      ordered.push(exercise)
    }
    return ordered
  }
  return []
}

export interface ResolvePoolOptions {
  slotType: 'pattern' | 'accessory'
  movementPattern?: MovementPattern
  accessoryGroup?: AccessoryGroup
  loadTier?: LoadTier
  profile: EquipmentProfile
  /** Soft preference order (first equipment-matching id wins). */
  preferredCatalogIds?: string[]
  /** Last resort when nothing matches equipment. */
  fallbackCatalogId?: string
}

/** Pick a catalog id from a pattern/accessory pool filtered by equipment. */
export function resolveFromPool(options: ResolvePoolOptions): string {
  const {
    profile,
    preferredCatalogIds = [],
    fallbackCatalogId,
    ...slotBits
  } = options

  const pool = poolForSlot(slotBits)
  const available = pool.filter((exercise) => matchesEquipment(exercise, profile))

  for (const id of preferredCatalogIds) {
    if (available.some((exercise) => exercise.id === id)) return id
  }

  // When callers named preferences that didn't match gear, honor fallback before an
  // arbitrary other pool row (e.g. keep pallof_press instead of swapping to plank).
  if (
    fallbackCatalogId &&
    preferredCatalogIds.length > 0 &&
    getCatalogExerciseById(fallbackCatalogId)
  ) {
    return fallbackCatalogId
  }

  if (available[0]) return available[0].id

  if (fallbackCatalogId && getCatalogExerciseById(fallbackCatalogId)) {
    return fallbackCatalogId
  }

  for (const id of preferredCatalogIds) {
    if (getCatalogExerciseById(id)) return id
  }

  return pool[0]?.id ?? 'bodyweight_squat'
}

export function resolveDefaultCatalogId(slot: TemplateSlot): string {
  return slot.defaultCatalogExerciseId
}

/** Equipment-aware resolve for a classic template slot — prefer default, else pool match. */
export function resolveSlotCatalogId(slot: TemplateSlot, profile: EquipmentProfile): string {
  return resolveFromPool({
    slotType: slot.slotType,
    movementPattern: slot.movementPattern,
    accessoryGroup: slot.accessoryGroup,
    loadTier: slot.loadTier,
    profile,
    preferredCatalogIds: [slot.defaultCatalogExerciseId],
  })
}

function equipmentLabelFor(catalog: CatalogExercise | undefined, fallback = '—'): string {
  if (!catalog) return fallback
  if (catalog.equipmentLabel) return catalog.equipmentLabel
  const keys = catalog.equipmentKeys
  if (!keys || keys.length === 0) return 'Bodyweight'
  return keys.join(', ')
}

export function exerciseFromCatalogId(
  category: WorkoutCategory,
  index: number,
  catalogId: string,
  slot?: TemplateSlot,
): Exercise {
  const catalog = getCatalogExerciseById(catalogId)
  return {
    id: slot?.id ?? `${category}-${index + 1}`,
    catalogExerciseId: catalogId,
    name: catalog?.name ?? catalogId,
    primaryMuscles: slot?.primaryMuscles ?? ['General'],
    equipment: equipmentLabelFor(catalog),
    sets: slot?.sets ?? '3',
    reps: slot?.reps ?? '8–12',
    suggestedRestSeconds: catalog
      ? getDefaultRestSeconds(catalog)
      : slot?.suggestedRestSeconds ?? 90,
    instructions: 'Instructions will go here.',
    cues: 'Coaching cues will go here.',
    commonMistakes: 'Common mistakes will go here.',
  }
}

export function resolveDefaultExercises(category: WorkoutCategory): Exercise[] {
  return getTemplateSlots(category).map((slot, index) =>
    exerciseFromCatalogId(category, index, resolveDefaultCatalogId(slot), slot),
  )
}

export function resolveExercisesForProfile(
  category: WorkoutCategory,
  profile: EquipmentProfile,
): Exercise[] {
  return getTemplateSlots(category).map((slot, index) =>
    exerciseFromCatalogId(category, index, resolveSlotCatalogId(slot, profile), slot),
  )
}
