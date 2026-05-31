import type { Exercise, WorkoutType } from '../types/workout'

function createExercise(
  id: string,
  name: string,
  primaryMuscles: string[],
  equipment: string,
  sets: string,
  reps: string,
  suggestedRestSeconds: number,
): Exercise {
  return {
    id,
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
      createExercise('push-1', 'Barbell Bench Press', ['Chest', 'Triceps'], 'Barbell, bench', '3', '6–10', 120),
      createExercise('push-2', 'Dumbbell Pullover', ['Chest', 'Lats'], 'Dumbbell, bench', '3', '10–12', 90),
      createExercise('push-3', 'Overhead Press', ['Shoulders', 'Triceps'], 'Barbell', '3', '6–10', 120),
      createExercise('push-4', 'Inclined Barbell Press', ['Upper chest', 'Triceps'], 'Barbell, incline bench', '3', '8–12', 90),
      createExercise('push-5', 'Lateral Raises', ['Side delts'], 'Dumbbells', '3', '12–15', 60),
      createExercise('push-6', 'Atomic Push-up', ['Chest', 'Core'], 'Bodyweight', '3', '8–12', 60),
      createExercise('push-7', 'Overhead DB Tricep Extension', ['Triceps'], 'Dumbbell', '3', '10–15', 60),
      createExercise('push-8', 'TRX Tricep Extension', ['Triceps'], 'TRX straps', '3', '10–15', 60),
      createExercise('push-9', 'Close-Grip Push-ups', ['Chest', 'Triceps'], 'Bodyweight', '3', '10–15', 60),
      createExercise('push-10', 'TRX Pike', ['Shoulders', 'Core'], 'TRX straps', '3', '8–12', 60),
    ],
  },
  {
    id: 'pull',
    title: 'Pull',
    description: 'Back and biceps pulling patterns.',
    estimatedDuration: '45–55 min',
    exercises: [
      createExercise('pull-1', 'Pull-up', ['Lats', 'Biceps'], 'Pull-up bar', '3', '5–10', 120),
      createExercise('pull-2', 'Barbell Row', ['Mid back', 'Lats'], 'Barbell', '3', '8–12', 90),
      createExercise('pull-3', 'TRX Row', ['Upper back'], 'TRX straps', '3', '10–15', 60),
      createExercise('pull-4', 'Rear Delt Fly', ['Rear delts'], 'Dumbbells', '3', '12–15', 60),
      createExercise('pull-5', 'Barbell Curl', ['Biceps'], 'Barbell', '3', '8–12', 60),
      createExercise('pull-6', 'Hammer Curl', ['Biceps', 'Forearms'], 'Dumbbells', '3', '10–12', 60),
    ],
  },
  {
    id: 'leg',
    title: 'Leg',
    description: 'Quads, hamstrings, glutes, and calves.',
    estimatedDuration: '50–60 min',
    exercises: [
      createExercise('leg-1', 'Squat', ['Quads', 'Glutes'], 'Barbell or dumbbells', '4', '6–10', 120),
      createExercise('leg-2', 'Romanian Deadlift', ['Hamstrings', 'Glutes'], 'Barbell or dumbbells', '3', '8–12', 90),
      createExercise('leg-3', 'Dumbbell Lunge', ['Quads', 'Glutes'], 'Dumbbells', '3', '10 each leg', 90),
      createExercise('leg-4', 'Hip Thrust', ['Glutes'], 'Bench, barbell or dumbbell', '3', '10–15', 90),
      createExercise('leg-5', 'Calf Raise', ['Calves'], 'Bodyweight or dumbbells', '3', '15–20', 60),
      createExercise('leg-6', 'Wall Sit', ['Quads'], 'Bodyweight', '3', '30–45 sec', 60),
    ],
  },
  {
    id: 'core',
    title: 'Core',
    description: 'Anti-extension, rotation, and stability.',
    estimatedDuration: '25–35 min',
    exercises: [
      createExercise('core-1', 'Plank', ['Abs', 'Core'], 'Bodyweight', '3', '30–60 sec', 45),
      createExercise('core-2', 'Side Plank', ['Obliques'], 'Bodyweight', '3', '20–40 sec each', 45),
      createExercise('core-3', 'Dead Bug', ['Deep core'], 'Bodyweight', '3', '8–12 each side', 45),
      createExercise('core-4', 'Hollow Hold', ['Abs'], 'Bodyweight', '3', '20–40 sec', 45),
      createExercise('core-5', 'Mountain Climber', ['Core', 'Hip flexors'], 'Bodyweight', '3', '20–30 sec', 45),
      createExercise('core-6', 'Pallof Press', ['Anti-rotation'], 'Band or cable', '3', '10–12 each side', 45),
    ],
  },
]

export function getWorkoutById(id: string): WorkoutType | undefined {
  return workouts.find((workout) => workout.id === id)
}
