import type { Exercise, WorkoutType } from '../types/workout'
import type { WorkoutCategory } from '../types/workout'
import { getUserProfile } from '../services/userProfileRepository'
import { getWorkoutExercises } from '../services/workoutTemplateService'
import { getTemplateSlots } from './workoutTemplateSlots'
import { exerciseFromCatalogId, resolveDefaultCatalogId, resolveDefaultExercises } from '../services/slotResolver'

interface WorkoutMeta {
  id: WorkoutCategory
  title: string
  description: string
  estimatedDuration: string
}

const WORKOUT_META: WorkoutMeta[] = [
  {
    id: 'push',
    title: 'Push',
    description: 'Chest, shoulders, and triceps focus.',
    estimatedDuration: '55–70 min',
  },
  {
    id: 'pull',
    title: 'Pull',
    description: 'Back, biceps, rear delts, and TRX core finishers.',
    estimatedDuration: '60–75 min',
  },
  {
    id: 'leg',
    title: 'Leg',
    description: 'Quads, hamstrings, glutes, and calves.',
    estimatedDuration: '50–60 min',
  },
  {
    id: 'core',
    title: 'Core',
    description: 'Anti-extension, rotation, and stability.',
    estimatedDuration: '25–35 min',
  },
  {
    id: 'full_body',
    title: 'Full Body',
    description: 'Warm-up, six main lifts, core, and mobility — one complete session.',
    estimatedDuration: '55–65 min',
  },
]

/** Classic defaults resolved from TemplateSlots (Decision B parity). */
export const workouts: WorkoutType[] = WORKOUT_META.map((meta) => ({
  ...meta,
  exercises: resolveDefaultExercises(meta.id),
}))

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
  for (const meta of WORKOUT_META) {
    const slots = getTemplateSlots(meta.id)
    const index = slots.findIndex((slot) => slot.id === slotId)
    if (index === -1) continue
    const slot = slots[index]
    return exerciseFromCatalogId(meta.id, index, resolveDefaultCatalogId(slot), slot)
  }
  return undefined
}
