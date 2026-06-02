import type { WorkoutCategory } from '../types/workout'
import type { WorkoutRecommendation } from '../types/training'

export type RecommendationAction = 'workout' | 'mobility' | 'timer'

export interface RecommendationNavigation {
  action: RecommendationAction
  workoutId?: WorkoutCategory
}

export function getRecommendationNavigation(
  recommendation: WorkoutRecommendation,
): RecommendationNavigation {
  switch (recommendation.workoutType) {
    case 'Push':
      return { action: 'workout', workoutId: 'push' }
    case 'Pull':
      return { action: 'workout', workoutId: 'pull' }
    case 'Leg':
      return { action: 'workout', workoutId: 'leg' }
    case 'Core':
      return { action: 'workout', workoutId: 'core' }
    case 'Mobility':
      return { action: 'mobility' }
    case 'Rest':
      return { action: 'mobility' }
    default:
      return { action: 'workout', workoutId: 'pull' }
  }
}
