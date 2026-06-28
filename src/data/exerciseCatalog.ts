/** Immutable exercise catalog — identity + coaching profile for history/progression. */

export type MovementClass =
  | 'compound_upper'
  | 'compound_lower'
  | 'isolation_upper'
  | 'isolation_lower'

export type CoachingMode = 'weighted' | 'bodyweight_reps' | 'time'

export interface CatalogExercise {
  id: string
  name: string
  coachingMode: CoachingMode
  /** Required for weighted and bodyweight_reps — drives rep range and rest defaults. */
  movementClass?: MovementClass
  weightIncrementLbs?: number
  /** Override the mode/class default rest duration for this specific exercise. */
  restSeconds?: number
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

export const exerciseCatalog: CatalogExercise[] = [
  { id: 'barbell_bench_press', name: 'Barbell Bench Press', coachingMode: 'weighted', movementClass: 'compound_upper', weightIncrementLbs: 5 },
  { id: 'barbell_floor_press', name: 'Barbell Floor Press', coachingMode: 'weighted', movementClass: 'compound_upper', weightIncrementLbs: 5 },
  { id: 'dumbbell_incline_press', name: 'Dumbbell Incline Press', coachingMode: 'weighted', movementClass: 'compound_upper', weightIncrementLbs: 2.5 },
  { id: 'dumbbell_pullover', name: 'Dumbbell Pullover', coachingMode: 'weighted', movementClass: 'isolation_upper', weightIncrementLbs: 2.5 },
  { id: 'overhead_press', name: 'Overhead Press', coachingMode: 'weighted', movementClass: 'compound_upper', weightIncrementLbs: 2.5 },
  { id: 'inclined_barbell_press', name: 'Inclined Barbell Press', coachingMode: 'weighted', movementClass: 'compound_upper', weightIncrementLbs: 5 },
  { id: 'lateral_raises', name: 'Lateral Raises', coachingMode: 'weighted', movementClass: 'isolation_upper', weightIncrementLbs: 2.5 },
  { id: 'atomic_push_up', name: 'Atomic Push-up', coachingMode: 'bodyweight_reps', movementClass: 'compound_upper' },
  { id: 'overhead_db_tricep_extension', name: 'Overhead DB Tricep Extension', coachingMode: 'weighted', movementClass: 'isolation_upper', weightIncrementLbs: 2.5 },
  { id: 'trx_tricep_extension', name: 'TRX Tricep Extension', coachingMode: 'bodyweight_reps', movementClass: 'isolation_upper' },
  { id: 'close_grip_push_ups', name: 'Close-Grip Push-ups', coachingMode: 'bodyweight_reps', movementClass: 'compound_upper' },
  { id: 'trx_pike', name: 'TRX Pike', coachingMode: 'bodyweight_reps', movementClass: 'isolation_upper' },
  { id: 'pull_ups', name: 'Pull-ups', coachingMode: 'bodyweight_reps', movementClass: 'compound_upper', restSeconds: 180 },
  { id: 'barbell_rows', name: 'Barbell Rows', coachingMode: 'weighted', movementClass: 'compound_upper', weightIncrementLbs: 2.5 },
  { id: 'single_dumbbell_arm_rows', name: 'Single Dumbbell Arm Rows', coachingMode: 'weighted', movementClass: 'compound_upper', weightIncrementLbs: 2.5 },
  { id: 'trx_rear_delt_fly', name: 'TRX Rear Delt Fly', coachingMode: 'bodyweight_reps', movementClass: 'isolation_upper' },
  { id: 'trx_rows', name: 'TRX Rows', coachingMode: 'bodyweight_reps', movementClass: 'compound_upper' },
  { id: 'barbell_curls', name: 'Barbell Curls', coachingMode: 'weighted', movementClass: 'isolation_upper', weightIncrementLbs: 5 },
  { id: 'barbell_reverse_curls', name: 'Barbell Reverse Curls', coachingMode: 'weighted', movementClass: 'isolation_upper', weightIncrementLbs: 5 },
  { id: 'trx_core_1', name: 'TRX Core 1', coachingMode: 'time', movementClass: 'isolation_upper' },
  { id: 'trx_core_2', name: 'TRX Core 2', coachingMode: 'time', movementClass: 'isolation_upper' },
  { id: 'trx_core_3', name: 'TRX Core 3', coachingMode: 'time', movementClass: 'isolation_upper' },
  { id: 'barbell_back_squat', name: 'Barbell Back Squat', coachingMode: 'weighted', movementClass: 'compound_lower', weightIncrementLbs: 10 },
  { id: 'goblet_squat', name: 'Goblet Squat', coachingMode: 'weighted', movementClass: 'compound_lower', weightIncrementLbs: 5 },
  { id: 'bodyweight_squat', name: 'Bodyweight Squat', coachingMode: 'bodyweight_reps', movementClass: 'compound_lower' },
  { id: 'barbell_hip_thrust', name: 'Barbell Hip Thrust', coachingMode: 'weighted', movementClass: 'compound_lower', weightIncrementLbs: 10 },
  { id: 'trx_weighted_lunge', name: 'TRX Weighted Lunge', coachingMode: 'weighted', movementClass: 'compound_lower', weightIncrementLbs: 5 },
  { id: 'trx_hamstring_curl', name: 'TRX Hamstring Curl', coachingMode: 'bodyweight_reps', movementClass: 'isolation_lower' },
  { id: 'standing_calf_raise', name: 'Standing Calf Raise', coachingMode: 'weighted', movementClass: 'isolation_lower', weightIncrementLbs: 2.5 },
  { id: 'trx_side_tuck', name: 'TRX Side Tuck', coachingMode: 'bodyweight_reps', movementClass: 'isolation_upper' },
  { id: 'plank', name: 'Plank', coachingMode: 'time', movementClass: 'isolation_upper' },
  { id: 'side_plank', name: 'Side Plank', coachingMode: 'time', movementClass: 'isolation_upper' },
  { id: 'dead_bug', name: 'Dead Bug', coachingMode: 'bodyweight_reps', movementClass: 'isolation_upper' },
  { id: 'hollow_hold', name: 'Hollow Hold', coachingMode: 'time', movementClass: 'isolation_upper' },
  { id: 'mountain_climber', name: 'Mountain Climber', coachingMode: 'time', movementClass: 'isolation_upper' },
  { id: 'pallof_press', name: 'Pallof Press', coachingMode: 'bodyweight_reps', movementClass: 'isolation_upper' },
]

const catalogById = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]))

export function getCatalogExerciseById(id: string): CatalogExercise | undefined {
  return catalogById.get(id)
}

export function isCatalogExerciseId(id: string): boolean {
  return catalogById.has(id)
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
