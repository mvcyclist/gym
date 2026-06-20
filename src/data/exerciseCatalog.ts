/** Immutable exercise catalog — used for history/coaching (Option A). */
export interface CatalogExercise {
  id: string
  name: string
}

export const exerciseCatalog: CatalogExercise[] = [
  { id: 'barbell_bench_press', name: 'Barbell Bench Press' },
  { id: 'dumbbell_pullover', name: 'Dumbbell Pullover' },
  { id: 'overhead_press', name: 'Overhead Press' },
  { id: 'inclined_barbell_press', name: 'Inclined Barbell Press' },
  { id: 'lateral_raises', name: 'Lateral Raises' },
  { id: 'atomic_push_up', name: 'Atomic Push-up' },
  { id: 'overhead_db_tricep_extension', name: 'Overhead DB Tricep Extension' },
  { id: 'trx_tricep_extension', name: 'TRX Tricep Extension' },
  { id: 'close_grip_push_ups', name: 'Close-Grip Push-ups' },
  { id: 'trx_pike', name: 'TRX Pike' },
  { id: 'pull_ups', name: 'Pull-ups' },
  { id: 'barbell_rows', name: 'Barbell Rows' },
  { id: 'single_dumbbell_arm_rows', name: 'Single Dumbbell Arm Rows' },
  { id: 'trx_rear_delt_fly', name: 'TRX Rear Delt Fly' },
  { id: 'barbell_curls', name: 'Barbell Curls' },
  { id: 'barbell_reverse_curls', name: 'Barbell Reverse Curls' },
  { id: 'trx_core_1', name: 'TRX Core 1' },
  { id: 'trx_core_2', name: 'TRX Core 2' },
  { id: 'trx_core_3', name: 'TRX Core 3' },
  { id: 'barbell_back_squat', name: 'Barbell Back Squat' },
  { id: 'barbell_hip_thrust', name: 'Barbell Hip Thrust' },
  { id: 'trx_weighted_lunge', name: 'TRX Weighted Lunge' },
  { id: 'trx_hamstring_curl', name: 'TRX Hamstring Curl' },
  { id: 'standing_calf_raise', name: 'Standing Calf Raise' },
  { id: 'trx_side_tuck', name: 'TRX Side Tuck' },
  { id: 'plank', name: 'Plank' },
  { id: 'side_plank', name: 'Side Plank' },
  { id: 'dead_bug', name: 'Dead Bug' },
  { id: 'hollow_hold', name: 'Hollow Hold' },
  { id: 'mountain_climber', name: 'Mountain Climber' },
  { id: 'pallof_press', name: 'Pallof Press' },
]

const catalogById = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]))

export function getCatalogExerciseById(id: string): CatalogExercise | undefined {
  return catalogById.get(id)
}

export function isCatalogExerciseId(id: string): boolean {
  return catalogById.has(id)
}
