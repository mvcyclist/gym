/** Immutable exercise catalog — identity, coaching profile, and movement-pattern pools. */

import type { EquipmentKey } from '../types/userProfile'

export type MovementClass =
  | 'compound_upper'
  | 'compound_lower'
  | 'isolation_upper'
  | 'isolation_lower'

export type CoachingMode = 'weighted' | 'bodyweight_reps' | 'time'

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'accessory'

export type LoadTier = 'heavy' | 'moderate' | 'low_impact'

export type AccessoryGroup =
  | 'biceps'
  | 'triceps'
  | 'rear_delt'
  | 'side_delt'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'lats'
  | 'mobility'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface CatalogExercise {
  id: string
  name: string
  coachingMode: CoachingMode
  /** Required for weighted and bodyweight_reps — drives rep range and rest defaults. */
  movementClass?: MovementClass
  weightIncrementLbs?: number
  /** Override the mode/class default rest duration for this specific exercise. */
  restSeconds?: number

  movementPattern: MovementPattern
  /** Required when movementPattern is a primary pattern; omit for accessories. */
  loadTier?: LoadTier
  /** Required when movementPattern === 'accessory'; omit otherwise. */
  accessoryGroup?: AccessoryGroup
  /** AND = all keys required; omit/empty = no gear required. */
  equipmentKeys?: EquipmentKey[]
  /** Display-only; derived from keys when omitted. */
  equipmentLabel?: string
  difficulty?: Difficulty
  /**
   * When false, excluded from pattern/accessory pool helpers (guided segment placeholders).
   * Defaults to true.
   */
  poolEligible?: boolean
}

export const REP_RANGES: Record<MovementClass, { floor: number; ceiling: number }> = {
  compound_upper: { floor: 6, ceiling: 10 },
  compound_lower: { floor: 6, ceiling: 10 },
  isolation_upper: { floor: 10, ceiling: 15 },
  isolation_lower: { floor: 10, ceiling: 15 },
}

const COMPOUND_REST_SECONDS = 180
const ISOLATION_REST_SECONDS = 90
const BODYWEIGHT_REST_SECONDS = 60

type PrimaryPattern = Exclude<MovementPattern, 'accessory'>

function primary(
  id: string,
  name: string,
  coachingMode: CoachingMode,
  movementPattern: PrimaryPattern,
  loadTier: LoadTier,
  opts: {
    movementClass?: MovementClass
    weightIncrementLbs?: number
    restSeconds?: number
    difficulty?: Difficulty
    equipmentKeys?: EquipmentKey[]
    equipmentLabel?: string
  } = {},
): CatalogExercise {
  return { id, name, coachingMode, movementPattern, loadTier, ...opts }
}

function accessory(
  id: string,
  name: string,
  coachingMode: CoachingMode,
  accessoryGroup: AccessoryGroup,
  opts: {
    movementClass?: MovementClass
    weightIncrementLbs?: number
    restSeconds?: number
    difficulty?: Difficulty
    equipmentKeys?: EquipmentKey[]
    equipmentLabel?: string
    poolEligible?: boolean
  } = {},
): CatalogExercise {
  return {
    id,
    name,
    coachingMode,
    movementPattern: 'accessory',
    accessoryGroup,
    ...opts,
  }
}

export const exerciseCatalog: CatalogExercise[] = [
  // --- Existing: horizontal / vertical push ---
  primary('barbell_bench_press', 'Barbell Bench Press', 'weighted', 'horizontal_push', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 5,
    difficulty: 'intermediate',
    equipmentKeys: ['barbell', 'bench'],
  }),
  primary('barbell_floor_press', 'Barbell Floor Press', 'weighted', 'horizontal_push', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 5,
    difficulty: 'intermediate',
    equipmentKeys: ['barbell'],
  }),
  primary('dumbbell_incline_press', 'Dumbbell Incline Press', 'weighted', 'horizontal_push', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'beginner',
    equipmentKeys: ['dumbbells', 'bench'],
  }),
  primary('dumbbell_flat_press', 'Dumbbell Flat Press', 'weighted', 'horizontal_push', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'beginner',
    equipmentKeys: ['dumbbells', 'bench'],
  }),
  primary('inclined_barbell_press', 'Inclined Barbell Press', 'weighted', 'horizontal_push', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 5,
    difficulty: 'intermediate',
    equipmentKeys: ['barbell', 'bench', 'rack'],
  }),
  primary('overhead_press', 'Overhead Press', 'weighted', 'vertical_push', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'intermediate',
    equipmentKeys: ['barbell'],
  }),
  // No required gear — used as a bodyweight horizontal-push fallback (and TRX when available).
  primary('atomic_push_up', 'Atomic Push-up', 'bodyweight_reps', 'horizontal_push', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'advanced',
    equipmentLabel: 'Bodyweight / TRX',
  }),
  primary('close_grip_push_ups', 'Close-Grip Push-ups', 'bodyweight_reps', 'horizontal_push', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'beginner',
  }),
  primary('trx_pike', 'TRX Pike', 'bodyweight_reps', 'vertical_push', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'advanced',
    equipmentKeys: ['trx'],
  }),

  // --- Existing: pull ---
  primary('pull_ups', 'Pull-ups', 'bodyweight_reps', 'vertical_pull', 'heavy', {
    movementClass: 'compound_upper',
    restSeconds: 180,
    difficulty: 'advanced',
    equipmentKeys: ['pullup'],
  }),
  primary('barbell_rows', 'Barbell Rows', 'weighted', 'horizontal_pull', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'intermediate',
    equipmentKeys: ['barbell'],
  }),
  primary('chest_supported_row', 'Chest-Supported Row', 'weighted', 'horizontal_pull', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'beginner',
    equipmentKeys: ['dumbbells', 'bench'],
  }),
  primary('single_dumbbell_arm_rows', 'Single Dumbbell Arm Rows', 'weighted', 'horizontal_pull', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'intermediate',
    equipmentKeys: ['dumbbells'],
  }),
  primary('trx_rows', 'TRX Rows', 'bodyweight_reps', 'horizontal_pull', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'beginner',
    equipmentKeys: ['trx'],
  }),

  // --- Existing: squat / hinge ---
  primary('barbell_back_squat', 'Barbell Back Squat', 'weighted', 'squat', 'heavy', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 10,
    difficulty: 'intermediate',
    equipmentKeys: ['barbell', 'rack'],
  }),
  primary('barbell_romanian_deadlift', 'Barbell Romanian Deadlift', 'weighted', 'hinge', 'heavy', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 10,
    difficulty: 'intermediate',
    equipmentKeys: ['barbell'],
  }),
  primary('barbell_hip_thrust', 'Barbell Hip Thrust', 'weighted', 'hinge', 'heavy', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 10,
    difficulty: 'beginner',
    equipmentKeys: ['barbell', 'bench'],
  }),
  primary('goblet_squat', 'Goblet Squat', 'weighted', 'squat', 'heavy', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 5,
    difficulty: 'beginner',
    equipmentKeys: ['dumbbells'],
  }),
  primary('bodyweight_squat', 'Bodyweight Squat', 'bodyweight_reps', 'squat', 'low_impact', {
    movementClass: 'compound_lower',
    difficulty: 'beginner',
  }),
  primary('trx_weighted_lunge', 'TRX Weighted Lunge', 'weighted', 'squat', 'moderate', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 5,
    difficulty: 'intermediate',
    equipmentKeys: ['trx', 'dumbbells'],
  }),
  primary('trx_hamstring_curl', 'TRX Hamstring Curl', 'bodyweight_reps', 'hinge', 'low_impact', {
    movementClass: 'isolation_lower',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),

  // --- Existing accessories (incl. K locks) ---
  accessory('dumbbell_pullover', 'Dumbbell Pullover', 'weighted', 'lats', {
    movementClass: 'isolation_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'beginner',
    equipmentKeys: ['dumbbells', 'bench'],
  }),
  accessory('lateral_raises', 'Lateral Raises', 'weighted', 'side_delt', {
    movementClass: 'isolation_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'beginner',
    equipmentKeys: ['dumbbells'],
  }),
  accessory('overhead_db_tricep_extension', 'Overhead DB Tricep Extension', 'weighted', 'triceps', {
    movementClass: 'isolation_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'beginner',
    equipmentKeys: ['dumbbells'],
  }),
  accessory('trx_tricep_extension', 'TRX Tricep Extension', 'bodyweight_reps', 'triceps', {
    movementClass: 'isolation_upper',
    difficulty: 'beginner',
    equipmentKeys: ['trx'],
  }),
  accessory('trx_rear_delt_fly', 'TRX Rear Delt Fly', 'bodyweight_reps', 'rear_delt', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  accessory('barbell_curls', 'Barbell Curls', 'weighted', 'biceps', {
    movementClass: 'isolation_upper',
    weightIncrementLbs: 5,
    difficulty: 'beginner',
    equipmentKeys: ['barbell'],
  }),
  accessory('barbell_reverse_curls', 'Barbell Reverse Curls', 'weighted', 'forearms', {
    movementClass: 'isolation_upper',
    weightIncrementLbs: 5,
    difficulty: 'beginner',
    equipmentKeys: ['barbell'],
  }),
  accessory('standing_calf_raise', 'Standing Calf Raise', 'weighted', 'calves', {
    movementClass: 'isolation_lower',
    weightIncrementLbs: 2.5,
    difficulty: 'beginner',
  }),
  accessory('trx_core_1', 'TRX Core 1', 'time', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'beginner',
    equipmentKeys: ['trx'],
  }),
  accessory('trx_core_2', 'TRX Core 2', 'time', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  accessory('trx_core_3', 'TRX Core 3', 'time', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  accessory('trx_side_tuck', 'TRX Side Tuck', 'bodyweight_reps', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  accessory('plank', 'Plank', 'time', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'beginner',
  }),
  accessory('weighted_plank', 'Weighted Plank', 'time', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['dumbbells'],
  }),
  accessory('hanging_leg_raise', 'Hanging Leg Raise', 'bodyweight_reps', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['pullup'],
  }),
  accessory('side_plank', 'Side Plank', 'time', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'beginner',
  }),
  accessory('dead_bug', 'Dead Bug', 'bodyweight_reps', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'beginner',
  }),
  accessory('hollow_hold', 'Hollow Hold', 'time', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
  }),
  accessory('mountain_climber', 'Mountain Climber', 'time', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'beginner',
  }),
  accessory('pallof_press', 'Pallof Press', 'bodyweight_reps', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['cables'],
  }),
  accessory('worlds_greatest_stretch', "World's Greatest Stretch", 'time', 'mobility', {
    movementClass: 'isolation_lower',
    difficulty: 'beginner',
  }),
  accessory('hip_90_90_switch', '90/90 Hip Switch', 'time', 'mobility', {
    movementClass: 'isolation_lower',
    difficulty: 'beginner',
  }),
  accessory('thoracic_rotation', 'Thoracic Rotation', 'bodyweight_reps', 'mobility', {
    movementClass: 'isolation_upper',
    difficulty: 'beginner',
  }),
  accessory('ankle_rocks', 'Ankle Rocks', 'time', 'mobility', {
    movementClass: 'isolation_lower',
    difficulty: 'beginner',
  }),

  // Guided Full Body segment placeholders — not pool-eligible
  accessory('warmup_segment', 'Warm-up', 'time', 'mobility', { poolEligible: false }),
  accessory('core_segment', 'Core', 'time', 'core', { poolEligible: false }),
  accessory('mobility_segment', 'Mobility', 'time', 'mobility', { poolEligible: false }),

  // --- Matrix: TRX / low_impact primaries + K accessories ---
  primary('trx_assisted_squat', 'TRX Assisted Squat', 'bodyweight_reps', 'squat', 'low_impact', {
    movementClass: 'compound_lower',
    difficulty: 'beginner',
    equipmentKeys: ['trx'],
  }),
  primary('trx_curtsy_lunge', 'TRX Crossing/Curtsy Lunge', 'bodyweight_reps', 'squat', 'low_impact', {
    movementClass: 'compound_lower',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  primary('trx_jump_squat', 'TRX Jump Squat', 'bodyweight_reps', 'squat', 'low_impact', {
    movementClass: 'compound_lower',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  primary('trx_pistol_squat', 'TRX Pistol Squat', 'bodyweight_reps', 'squat', 'low_impact', {
    movementClass: 'compound_lower',
    difficulty: 'advanced',
    equipmentKeys: ['trx'],
  }),
  primary('trx_bulgarian_split_squat', 'TRX Bulgarian Split Squat', 'bodyweight_reps', 'squat', 'low_impact', {
    movementClass: 'compound_lower',
    difficulty: 'advanced',
    equipmentKeys: ['trx'],
  }),
  primary('trx_hip_press', 'TRX Hip Press / Glute Bridge', 'bodyweight_reps', 'hinge', 'low_impact', {
    movementClass: 'compound_lower',
    difficulty: 'beginner',
    equipmentKeys: ['trx'],
  }),
  primary('trx_single_leg_rdl', 'TRX Single-Leg RDL', 'bodyweight_reps', 'hinge', 'low_impact', {
    movementClass: 'compound_lower',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  primary('trx_suspended_hinge', 'TRX Suspended Single-Leg Hinge', 'bodyweight_reps', 'hinge', 'low_impact', {
    movementClass: 'compound_lower',
    difficulty: 'advanced',
    equipmentKeys: ['trx'],
  }),
  primary('trx_chest_press', 'TRX Chest Press', 'bodyweight_reps', 'horizontal_push', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'beginner',
    equipmentKeys: ['trx'],
  }),
  primary('trx_chest_fly', 'TRX Chest Fly', 'bodyweight_reps', 'horizontal_push', 'low_impact', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  primary('trx_clock_press', 'TRX Clock Press', 'bodyweight_reps', 'horizontal_push', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'advanced',
    equipmentKeys: ['trx'],
  }),
  primary('trx_single_arm_row', 'TRX Single-Arm Row', 'bodyweight_reps', 'horizontal_pull', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  primary('trx_power_pull', 'TRX Power Pull', 'bodyweight_reps', 'horizontal_pull', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'advanced',
    equipmentKeys: ['trx'],
  }),
  accessory('trx_face_pull', 'TRX Face Pull', 'bodyweight_reps', 'rear_delt', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  accessory('trx_rollout_press', 'TRX Kneeling Rollout-to-Press', 'bodyweight_reps', 'core', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  primary('trx_kneeling_lat_pulldown', 'TRX Kneeling Lat Pulldown', 'bodyweight_reps', 'vertical_pull', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'beginner',
    equipmentKeys: ['trx'],
  }),
  primary('trx_assisted_pull_up', 'TRX Assisted Pull-up', 'bodyweight_reps', 'vertical_pull', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  accessory('trx_y_fly', 'TRX Y-Fly', 'bodyweight_reps', 'rear_delt', {
    movementClass: 'isolation_upper',
    difficulty: 'intermediate',
    equipmentKeys: ['trx'],
  }),
  primary('trx_alligator_pull', 'TRX Alligator / W-Pull', 'bodyweight_reps', 'vertical_pull', 'low_impact', {
    movementClass: 'compound_upper',
    difficulty: 'advanced',
    equipmentKeys: ['trx'],
  }),

  // --- Matrix: barbell / heavy additions ---
  primary('barbell_front_squat', 'Barbell Front Squat', 'weighted', 'squat', 'heavy', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 10,
    difficulty: 'advanced',
    equipmentKeys: ['barbell', 'rack'],
  }),
  primary('box_squat', 'Box Squat', 'weighted', 'squat', 'heavy', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 10,
    difficulty: 'intermediate',
    equipmentKeys: ['barbell', 'rack'],
  }),
  primary('barbell_conventional_deadlift', 'Conventional Deadlift', 'weighted', 'hinge', 'heavy', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 10,
    difficulty: 'advanced',
    equipmentKeys: ['barbell'],
  }),
  primary('pendlay_row', 'Pendlay Row', 'weighted', 'horizontal_pull', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 5,
    difficulty: 'advanced',
    equipmentKeys: ['barbell'],
  }),
  primary('t_bar_row', 'T-Bar Row', 'weighted', 'horizontal_pull', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 5,
    difficulty: 'intermediate',
    equipmentKeys: ['barbell'],
  }),
  primary('push_press', 'Push Press', 'weighted', 'vertical_push', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 5,
    difficulty: 'advanced',
    equipmentKeys: ['barbell'],
  }),
  primary('barbell_high_pull', 'Barbell High Pull', 'weighted', 'vertical_pull', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 5,
    difficulty: 'advanced',
    equipmentKeys: ['barbell'],
  }),

  // --- Matrix: dumbbell additions ---
  primary('dumbbell_bulgarian_split_squat', 'Dumbbell Bulgarian Split Squat', 'weighted', 'squat', 'heavy', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 5,
    difficulty: 'advanced',
    equipmentKeys: ['dumbbells'],
  }),
  primary('dumbbell_lunges', 'Dumbbell Lunges', 'weighted', 'squat', 'heavy', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 5,
    difficulty: 'intermediate',
    equipmentKeys: ['dumbbells'],
  }),
  primary('dumbbell_romanian_deadlift', 'Dumbbell Romanian Deadlift', 'weighted', 'hinge', 'heavy', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 5,
    difficulty: 'intermediate',
    equipmentKeys: ['dumbbells'],
  }),
  primary('dumbbell_single_leg_rdl', 'Dumbbell Single-Leg RDL', 'weighted', 'hinge', 'moderate', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 2.5,
    difficulty: 'advanced',
    equipmentKeys: ['dumbbells'],
  }),
  primary('dumbbell_swing', 'Dumbbell Swing', 'weighted', 'hinge', 'moderate', {
    movementClass: 'compound_lower',
    weightIncrementLbs: 5,
    difficulty: 'intermediate',
    equipmentKeys: ['dumbbells'],
  }),
  primary('dumbbell_floor_press', 'Dumbbell Floor Press', 'weighted', 'horizontal_push', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'beginner',
    equipmentKeys: ['dumbbells'],
  }),
  primary('dumbbell_renegade_row', 'Dumbbell Renegade Row', 'weighted', 'horizontal_pull', 'moderate', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'advanced',
    equipmentKeys: ['dumbbells'],
  }),
  primary('seated_dumbbell_shoulder_press', 'Seated Dumbbell Shoulder Press', 'weighted', 'vertical_push', 'heavy', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'beginner',
    equipmentKeys: ['dumbbells', 'bench'],
  }),
  primary('arnold_press', 'Arnold Press', 'weighted', 'vertical_push', 'moderate', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'intermediate',
    equipmentKeys: ['dumbbells'],
  }),
  primary('standing_single_arm_db_press', 'Standing Single-Arm Dumbbell Press', 'weighted', 'vertical_push', 'moderate', {
    movementClass: 'compound_upper',
    weightIncrementLbs: 2.5,
    difficulty: 'advanced',
    equipmentKeys: ['dumbbells'],
  }),
]

const catalogById = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]))

export function getCatalogExerciseById(id: string): CatalogExercise | undefined {
  return catalogById.get(id)
}

export function isCatalogExerciseId(id: string): boolean {
  return catalogById.has(id)
}

function isPoolEligible(exercise: CatalogExercise): boolean {
  return exercise.poolEligible !== false
}

/** Pattern-pool query. When `loadTier` is set, only that tier is returned. Accessories excluded unless pattern is `accessory`. */
export function getExercisesByPattern(
  pattern: MovementPattern,
  loadTier?: LoadTier,
): CatalogExercise[] {
  return exerciseCatalog.filter((exercise) => {
    if (!isPoolEligible(exercise)) return false
    if (exercise.movementPattern !== pattern) return false
    if (loadTier !== undefined && exercise.loadTier !== loadTier) return false
    return true
  })
}

export function getExercisesByAccessoryGroup(group: AccessoryGroup): CatalogExercise[] {
  return exerciseCatalog.filter(
    (exercise) =>
      isPoolEligible(exercise) &&
      exercise.movementPattern === 'accessory' &&
      exercise.accessoryGroup === group,
  )
}

export function getRepRangeForClass(movementClass: MovementClass): { floor: number; ceiling: number } {
  return REP_RANGES[movementClass]
}

export function getRepRangeForCatalog(exercise: CatalogExercise): { floor: number; ceiling: number } | null {
  if (!exercise.movementClass) return null
  return getRepRangeForClass(exercise.movementClass)
}

export function getDefaultRestSeconds(exercise: CatalogExercise): number {
  if (exercise.restSeconds !== undefined) return exercise.restSeconds
  if (exercise.coachingMode === 'time' || exercise.coachingMode === 'bodyweight_reps') {
    return BODYWEIGHT_REST_SECONDS
  }
  if (!exercise.movementClass) return COMPOUND_REST_SECONDS
  return exercise.movementClass.startsWith('compound') ? COMPOUND_REST_SECONDS : ISOLATION_REST_SECONDS
}

export function parseTemplateSetCount(sets: string): number {
  const value = parseInt(sets, 10)
  return Number.isNaN(value) || value < 1 ? 3 : value
}
