/**
 * Named Full Body pool presets for Home quick-preview cards.
 * Fixed catalog picks (not profile/template-source shuffle).
 */
import type { TemplateSlot } from '../types/templateSlot'
import type { Exercise } from '../types/workout'
import { exerciseFromCatalogId } from '../services/slotResolver'

export type FullBodyPoolPresetId = 'heavy' | 'moderate' | 'trx'

export interface FullBodyPoolPreset {
  id: FullBodyPoolPresetId
  label: string
  description: string
  slots: TemplateSlot[]
}

function patternSlot(
  id: string,
  movementPattern: NonNullable<TemplateSlot['movementPattern']>,
  defaultCatalogExerciseId: string,
  primaryMuscles: string[],
  sets: string,
  reps: string,
  suggestedRestSeconds: number,
  loadTier: NonNullable<TemplateSlot['loadTier']> = 'heavy',
): TemplateSlot {
  return {
    id,
    slotType: 'pattern',
    movementPattern,
    loadTier,
    defaultCatalogExerciseId,
    primaryMuscles,
    sets,
    reps,
    suggestedRestSeconds,
  }
}

const HEAVY_SLOTS: TemplateSlot[] = [
  patternSlot('full_body-1', 'squat', 'barbell_back_squat', ['Quads', 'Glutes'], '2', '6–10', 180, 'heavy'),
  patternSlot('full_body-2', 'horizontal_push', 'barbell_bench_press', ['Chest', 'Triceps'], '2', '6–10', 120, 'heavy'),
  patternSlot('full_body-3', 'vertical_pull', 'pull_ups', ['Lats', 'Biceps'], '2', '5–10', 180, 'heavy'),
  patternSlot('full_body-4', 'hinge', 'barbell_romanian_deadlift', ['Hamstrings', 'Glutes'], '2', '6–10', 120, 'heavy'),
  patternSlot('full_body-5', 'vertical_push', 'overhead_press', ['Shoulders', 'Triceps'], '2', '6–10', 120, 'heavy'),
  patternSlot('full_body-6', 'horizontal_pull', 'chest_supported_row', ['Mid back', 'Lats'], '2', '6–10', 120, 'heavy'),
]

const MODERATE_SLOTS: TemplateSlot[] = [
  patternSlot('full_body-1', 'squat', 'goblet_squat', ['Quads', 'Glutes'], '2', '6–10', 180, 'moderate'),
  patternSlot('full_body-2', 'horizontal_push', 'dumbbell_flat_press', ['Chest', 'Triceps'], '2', '6–10', 120, 'moderate'),
  patternSlot('full_body-3', 'vertical_pull', 'pull_ups', ['Lats', 'Biceps'], '2', '5–10', 180, 'moderate'),
  patternSlot('full_body-4', 'hinge', 'dumbbell_romanian_deadlift', ['Hamstrings', 'Glutes'], '2', '6–10', 120, 'moderate'),
  patternSlot('full_body-5', 'vertical_push', 'seated_dumbbell_shoulder_press', ['Shoulders', 'Triceps'], '2', '6–10', 120, 'moderate'),
  patternSlot('full_body-6', 'horizontal_pull', 'single_dumbbell_arm_rows', ['Mid back', 'Lats'], '2', '6–10', 120, 'moderate'),
]

const TRX_SLOTS: TemplateSlot[] = [
  patternSlot('full_body-1', 'squat', 'trx_assisted_squat', ['Quads', 'Glutes'], '2', '6–10', 180, 'low_impact'),
  patternSlot('full_body-2', 'horizontal_push', 'trx_chest_press', ['Chest', 'Triceps'], '2', '6–10', 120, 'low_impact'),
  patternSlot('full_body-3', 'vertical_pull', 'trx_kneeling_lat_pulldown', ['Lats', 'Biceps'], '2', '5–10', 180, 'low_impact'),
  patternSlot('full_body-4', 'hinge', 'trx_hip_press', ['Hamstrings', 'Glutes'], '2', '6–10', 120, 'low_impact'),
  patternSlot('full_body-5', 'vertical_push', 'trx_pike', ['Shoulders', 'Core'], '2', '6–10', 120, 'low_impact'),
  patternSlot('full_body-6', 'horizontal_pull', 'trx_rows', ['Mid back', 'Lats'], '2', '6–10', 120, 'low_impact'),
]

export const FULL_BODY_POOL_PRESETS: FullBodyPoolPreset[] = [
  {
    id: 'heavy',
    label: 'Heavy',
    description: 'Barbell-focused full body across all six movement patterns.',
    slots: HEAVY_SLOTS,
  },
  {
    id: 'moderate',
    label: 'Moderate',
    description: 'Dumbbell-leaning full body across all six movement patterns.',
    slots: MODERATE_SLOTS,
  },
  {
    id: 'trx',
    label: 'TRX',
    description: 'Suspension-trainer full body — one TRX primary per pattern.',
    slots: TRX_SLOTS,
  },
]

export function getFullBodyPoolPreset(id: FullBodyPoolPresetId): FullBodyPoolPreset {
  const preset = FULL_BODY_POOL_PRESETS.find((entry) => entry.id === id)
  if (!preset) throw new Error(`Unknown full-body pool preset: ${id}`)
  return preset
}

export function getFullBodyPoolPresetExercises(id: FullBodyPoolPresetId): Exercise[] {
  const preset = getFullBodyPoolPreset(id)
  return preset.slots.map((slot, index) =>
    exerciseFromCatalogId('full_body', index, slot.defaultCatalogExerciseId, slot),
  )
}
