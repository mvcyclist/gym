import type { WorkoutCategory } from '../types/workout'
import type { WorkoutType } from '../types/training'

export type RecommendationAction = 'workout' | 'cardio' | 'mobility' | 'core' | 'timer'

export interface RecommendationNavigation {
  action: RecommendationAction
  workoutId?: WorkoutCategory
  cardioType?: WorkoutType
}

const CARDIO_TYPES: WorkoutType[] = ['Swim', 'Run', 'Bike', 'Walk']

export function getRecommendationNavigation(type: WorkoutType): RecommendationNavigation {
  if (type === 'Push') return { action: 'workout', workoutId: 'push' }
  if (type === 'Pull') return { action: 'workout', workoutId: 'pull' }
  if (type === 'Leg')  return { action: 'workout', workoutId: 'leg' }
  if (type === 'Core') return { action: 'core' }
  if (CARDIO_TYPES.includes(type)) return { action: 'cardio', cardioType: type }
  return { action: 'mobility' }
}
