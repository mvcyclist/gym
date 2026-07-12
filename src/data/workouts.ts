import type { Exercise, WorkoutType } from '../types/workout'
import type { WorkoutCategory } from '../types/workout'
import { getUserProfile } from '../services/userProfileRepository'
import { getWorkoutExercises } from '../services/workoutTemplateService'

function createExercise(
  id: string,
  catalogExerciseId: string,
  name: string,
  primaryMuscles: string[],
  equipment: string,
  sets: string,
  reps: string,
  suggestedRestSeconds: number,
): Exercise {
  return {
    id,
    catalogExerciseId,
    name,
    primaryMuscles,
    equipment,
    sets,
    reps,
    suggestedRestSeconds,
    instructions: 'Instructions will go here.',
    cues: 'Coaching cues will go here.',
    commonMistakes: 'Common mistakes will go here.',
  }
}

export const workouts: WorkoutType[] = [
  {
    id: 'push',
    title: 'Push',
    description: 'Chest, shoulders, and triceps focus.',
    estimatedDuration: '55–70 min',
    exercises: [
      createExercise('push-1', 'barbell_bench_press', 'Barbell Bench Press', ['Chest', 'Triceps'], 'Barbell, bench', '3', '6–10', 120),
      createExercise('push-2', 'dumbbell_pullover', 'Dumbbell Pullover', ['Chest', 'Lats'], 'Dumbbell, bench', '3', '10–12', 90),
      createExercise('push-3', 'overhead_press', 'Overhead Press', ['Shoulders', 'Triceps'], 'Barbell', '3', '6–10', 120),
      createExercise('push-4', 'inclined_barbell_press', 'Inclined Barbell Press', ['Upper chest', 'Triceps'], 'Barbell, incline bench', '3', '8–12', 90),
      createExercise('push-5', 'lateral_raises', 'Lateral Raises', ['Side delts'], 'Dumbbells', '3', '12–15', 60),
      createExercise('push-6', 'atomic_push_up', 'Atomic Push-up', ['Chest', 'Core'], 'Bodyweight', '3', '8–12', 60),
      createExercise('push-7', 'overhead_db_tricep_extension', 'Overhead DB Tricep Extension', ['Triceps'], 'Dumbbell', '3', '10–15', 60),
      createExercise('push-8', 'trx_tricep_extension', 'TRX Tricep Extension', ['Triceps'], 'TRX straps', '3', '10–15', 60),
      createExercise('push-9', 'close_grip_push_ups', 'Close-Grip Push-ups', ['Chest', 'Triceps'], 'Bodyweight', '3', '10–15', 60),
      createExercise('push-10', 'trx_pike', 'TRX Pike', ['Shoulders', 'Core'], 'TRX straps', '3', '8–12', 60),
    ],
  },
  {
    id: 'pull',
    title: 'Pull',
    description: 'Back, biceps, rear delts, and TRX core finishers.',
    estimatedDuration: '60–75 min',
    exercises: [
      createExercise('pull-1', 'pull_ups', 'Pull-ups', ['Lats', 'Biceps'], 'Pull-up bar', '3', '5–10', 180),
      createExercise('pull-2', 'barbell_rows', 'Barbell Rows', ['Mid back', 'Lats'], 'Barbell', '3', '8–12', 120),
      createExercise('pull-3', 'single_dumbbell_arm_rows', 'Single Dumbbell Arm Rows', ['Lats', 'Mid back'], 'Dumbbell, bench', '3', '8–12 each', 90),
      createExercise('pull-4', 'trx_rear_delt_fly', 'TRX Rear Delt Fly', ['Rear delts'], 'TRX straps', '3', '12–15', 60),
      createExercise('pull-5', 'barbell_curls', 'Barbell Curls', ['Biceps'], 'Barbell', '3', '8–12', 75),
      createExercise('pull-6', 'barbell_reverse_curls', 'Barbell Reverse Curls', ['Forearms', 'Biceps'], 'Barbell', '3', '10–12', 75),
      createExercise('pull-7', 'trx_core_1', 'TRX Core 1', ['Core'], 'TRX straps', '3', '30–45 sec', 60),
      createExercise('pull-8', 'trx_core_2', 'TRX Core 2', ['Core'], 'TRX straps', '3', '30–45 sec', 60),
      createExercise('pull-9', 'trx_core_3', 'TRX Core 3', ['Core'], 'TRX straps', '3', '30–45 sec', 60),
    ],
  },
  {
    id: 'leg',
    title: 'Leg',
    description: 'Quads, hamstrings, glutes, and calves.',
    estimatedDuration: '50–60 min',
    exercises: [
      createExercise('leg-1', 'barbell_back_squat', 'Barbell Back Squat', ['Quads', 'Glutes', 'Core'], 'Barbell', '4', '8-10', 180),
      createExercise('leg-2', 'barbell_hip_thrust', 'Barbell Hip Thrust', ['Glutes', 'Hamstrings'], 'Barbell, bench', '3', '8-10', 120),
      createExercise('leg-3', 'trx_weighted_lunge', 'TRX Weighted Lunge', ['Quads', 'Glutes', 'Balance'], 'TRX, Dumbbells', '3', '10 each leg', 90),
      createExercise('leg-4', 'trx_hamstring_curl', 'TRX Hamstring Curl', ['Hamstrings'], 'TRX', '2', '10-12', 75),
      createExercise('leg-5', 'standing_calf_raise', 'Standing Calf Raise', ['Calves'], 'Dumbbells', '3', '10-15', 60),
      createExercise('leg-6', 'trx_side_tuck', 'TRX Side Tuck', ['Core', 'Obliques'], 'TRX', '3', '10 each side', 60),
    ],
  },
  {
    id: 'core',
    title: 'Core',
    description: 'Anti-extension, rotation, and stability.',
    estimatedDuration: '25–35 min',
    exercises: [
      createExercise('core-1', 'plank', 'Plank', ['Abs', 'Core'], 'Bodyweight', '3', '30–60 sec', 45),
      createExercise('core-2', 'side_plank', 'Side Plank', ['Obliques'], 'Bodyweight', '3', '20–40 sec each', 45),
      createExercise('core-3', 'dead_bug', 'Dead Bug', ['Deep core'], 'Bodyweight', '3', '8–12 each side', 45),
      createExercise('core-4', 'hollow_hold', 'Hollow Hold', ['Abs'], 'Bodyweight', '3', '20–40 sec', 45),
      createExercise('core-5', 'mountain_climber', 'Mountain Climber', ['Core', 'Hip flexors'], 'Bodyweight', '3', '20–30 sec', 45),
      createExercise('core-6', 'pallof_press', 'Pallof Press', ['Anti-rotation'], 'Band or cable', '3', '10–12 each side', 45),
    ],
  },
  {
    id: 'full_body',
    title: 'Full Body',
    description: 'Warm-up, six main lifts, core, and mobility — one complete session.',
    estimatedDuration: '55–65 min',
    exercises: [
      createExercise('full_body-1', 'barbell_back_squat', 'Barbell Back Squat', ['Quads', 'Glutes'], 'Barbell, rack', '2', '6–10', 180),
      createExercise('full_body-2', 'barbell_bench_press', 'Barbell Bench Press', ['Chest', 'Triceps'], 'Barbell, bench', '2', '6–10', 120),
      createExercise('full_body-3', 'pull_ups', 'Pull-ups', ['Lats', 'Biceps'], 'Pull-up bar', '2', '5–10', 180),
      createExercise('full_body-4', 'barbell_romanian_deadlift', 'Barbell Romanian Deadlift', ['Hamstrings', 'Glutes'], 'Barbell', '2', '6–10', 120),
      createExercise('full_body-5', 'overhead_press', 'Overhead Press', ['Shoulders', 'Triceps'], 'Barbell', '2', '6–10', 120),
      createExercise('full_body-6', 'chest_supported_row', 'Chest-Supported Row', ['Mid back', 'Lats'], 'Incline bench, dumbbells', '2', '6–10', 120),
    ],
  },
]

export function getWorkoutById(id: string): WorkoutType | undefined {
  const staticWorkout = workouts.find((workout) => workout.id === id)
  if (!staticWorkout) return undefined

  const profile = getUserProfile()
  if (!profile.onboardingComplete) return staticWorkout

  const exercises = getWorkoutExercises(id as WorkoutCategory, profile)
  return { ...staticWorkout, exercises }
}

export function getStaticWorkoutById(id: string): WorkoutType | undefined {
  return workouts.find((workout) => workout.id === id)
}

export function getExerciseByTemplateSlotId(slotId: string): Exercise | undefined {
  for (const workout of workouts) {
    const exercise = workout.exercises.find((item) => item.id === slotId)
    if (exercise) return exercise
  }
  return undefined
}
