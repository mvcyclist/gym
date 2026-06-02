import type { ActivityType } from '../types/training'
import type { WorkoutCategory } from '../types/workout'

export function workoutCategoryToActivityType(category: WorkoutCategory): ActivityType {
  const map: Record<WorkoutCategory, ActivityType> = {
    push: 'Push',
    pull: 'Pull',
    leg: 'Leg',
    core: 'Core',
  }
  return map[category]
}
