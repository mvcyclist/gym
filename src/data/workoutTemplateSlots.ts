import type { TemplateSlot } from '../types/templateSlot'
import type { WorkoutCategory } from '../types/workout'

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

function accessorySlot(
  id: string,
  accessoryGroup: NonNullable<TemplateSlot['accessoryGroup']>,
  defaultCatalogExerciseId: string,
  primaryMuscles: string[],
  sets: string,
  reps: string,
  suggestedRestSeconds: number,
): TemplateSlot {
  return {
    id,
    slotType: 'accessory',
    accessoryGroup,
    defaultCatalogExerciseId,
    primaryMuscles,
    sets,
    reps,
    suggestedRestSeconds,
  }
}

/** Classic template slots — defaults match pre–Phase 2 workouts.ts lists. */
export const WORKOUT_TEMPLATE_SLOTS: Record<WorkoutCategory, TemplateSlot[]> = {
  push: [
    patternSlot('push-1', 'horizontal_push', 'barbell_bench_press', ['Chest', 'Triceps'], '3', '6–10', 120),
    accessorySlot('push-2', 'lats', 'dumbbell_pullover', ['Chest', 'Lats'], '3', '10–12', 90),
    patternSlot('push-3', 'vertical_push', 'overhead_press', ['Shoulders', 'Triceps'], '3', '6–10', 120),
    patternSlot('push-4', 'horizontal_push', 'inclined_barbell_press', ['Upper chest', 'Triceps'], '3', '8–12', 90),
    accessorySlot('push-5', 'side_delt', 'lateral_raises', ['Side delts'], '3', '12–15', 60),
    patternSlot('push-6', 'horizontal_push', 'atomic_push_up', ['Chest', 'Core'], '3', '8–12', 60, 'low_impact'),
    accessorySlot('push-7', 'triceps', 'overhead_db_tricep_extension', ['Triceps'], '3', '10–15', 60),
    accessorySlot('push-8', 'triceps', 'trx_tricep_extension', ['Triceps'], '3', '10–15', 60),
    patternSlot('push-9', 'horizontal_push', 'close_grip_push_ups', ['Chest', 'Triceps'], '3', '10–15', 60, 'low_impact'),
    patternSlot('push-10', 'vertical_push', 'trx_pike', ['Shoulders', 'Core'], '3', '8–12', 60, 'low_impact'),
  ],
  pull: [
    patternSlot('pull-1', 'vertical_pull', 'pull_ups', ['Lats', 'Biceps'], '3', '5–10', 180),
    patternSlot('pull-2', 'horizontal_pull', 'barbell_rows', ['Mid back', 'Lats'], '3', '8–12', 120),
    patternSlot('pull-3', 'horizontal_pull', 'single_dumbbell_arm_rows', ['Lats', 'Mid back'], '3', '8–12 each', 90),
    accessorySlot('pull-4', 'rear_delt', 'trx_rear_delt_fly', ['Rear delts'], '3', '12–15', 60),
    accessorySlot('pull-5', 'biceps', 'barbell_curls', ['Biceps'], '3', '8–12', 75),
    accessorySlot('pull-6', 'forearms', 'barbell_reverse_curls', ['Forearms', 'Biceps'], '3', '10–12', 75),
    accessorySlot('pull-7', 'core', 'trx_core_1', ['Core'], '3', '30–45 sec', 60),
    accessorySlot('pull-8', 'core', 'trx_core_2', ['Core'], '3', '30–45 sec', 60),
    accessorySlot('pull-9', 'core', 'trx_core_3', ['Core'], '3', '30–45 sec', 60),
  ],
  leg: [
    patternSlot('leg-1', 'squat', 'barbell_back_squat', ['Quads', 'Glutes', 'Core'], '4', '8-10', 180),
    patternSlot('leg-2', 'hinge', 'barbell_hip_thrust', ['Glutes', 'Hamstrings'], '3', '8-10', 120),
    patternSlot('leg-3', 'squat', 'trx_weighted_lunge', ['Quads', 'Glutes', 'Balance'], '3', '10 each leg', 90, 'moderate'),
    patternSlot('leg-4', 'hinge', 'trx_hamstring_curl', ['Hamstrings'], '2', '10-12', 75, 'low_impact'),
    accessorySlot('leg-5', 'calves', 'standing_calf_raise', ['Calves'], '3', '10-15', 60),
    accessorySlot('leg-6', 'core', 'trx_side_tuck', ['Core', 'Obliques'], '3', '10 each side', 60),
  ],
  core: [
    accessorySlot('core-1', 'core', 'plank', ['Abs', 'Core'], '3', '30–60 sec', 45),
    accessorySlot('core-2', 'core', 'side_plank', ['Obliques'], '3', '20–40 sec each', 45),
    accessorySlot('core-3', 'core', 'dead_bug', ['Deep core'], '3', '8–12 each side', 45),
    accessorySlot('core-4', 'core', 'hollow_hold', ['Abs'], '3', '20–40 sec', 45),
    accessorySlot('core-5', 'core', 'mountain_climber', ['Core', 'Hip flexors'], '3', '20–30 sec', 45),
    accessorySlot('core-6', 'core', 'pallof_press', ['Anti-rotation'], '3', '10–12 each side', 45),
  ],
  full_body: [
    patternSlot('full_body-1', 'squat', 'barbell_back_squat', ['Quads', 'Glutes'], '2', '6–10', 180),
    patternSlot('full_body-2', 'horizontal_push', 'barbell_bench_press', ['Chest', 'Triceps'], '2', '6–10', 120),
    patternSlot('full_body-3', 'vertical_pull', 'pull_ups', ['Lats', 'Biceps'], '2', '5–10', 180),
    patternSlot('full_body-4', 'hinge', 'barbell_romanian_deadlift', ['Hamstrings', 'Glutes'], '2', '6–10', 120),
    patternSlot('full_body-5', 'vertical_push', 'overhead_press', ['Shoulders', 'Triceps'], '2', '6–10', 120),
    patternSlot('full_body-6', 'horizontal_pull', 'chest_supported_row', ['Mid back', 'Lats'], '2', '6–10', 120),
  ],
}

export function getTemplateSlots(category: WorkoutCategory): TemplateSlot[] {
  return WORKOUT_TEMPLATE_SLOTS[category] ?? []
}
