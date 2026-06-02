export type ActivityType =
  | 'Push'
  | 'Pull'
  | 'Leg'
  | 'Core'
  | 'Mobility'
  | 'Swim'
  | 'Bike'
  | 'Walk'
  | 'Rest'
  | 'Other'

export type Intensity = 'Easy' | 'Moderate' | 'Hard'

export type RecommendedWorkoutType = 'Push' | 'Pull' | 'Leg' | 'Core' | 'Mobility' | 'Rest'

export type RecommendationVariant = 'Full' | 'Lite' | 'Short'

export interface ActivityEntry {
  id: string
  date: string
  type: ActivityType
  intensity?: Intensity
  durationMinutes?: number
  notes?: string
  source?: 'workout' | 'manual'
  sessionId?: string
  sessionStatus?: 'completed' | 'partial'
}

export interface DayActivity {
  date: string
  dayLabel: string
  activities: ActivityEntry[]
}

export interface WorkoutRecommendation {
  workoutType: RecommendedWorkoutType
  variant?: RecommendationVariant
  title: string
  reason: string
  warnings?: string[]
}

export const ACTIVITY_TYPES: ActivityType[] = [
  'Push',
  'Pull',
  'Leg',
  'Core',
  'Mobility',
  'Swim',
  'Bike',
  'Walk',
  'Rest',
  'Other',
]

export const INTENSITY_LEVELS: Intensity[] = ['Easy', 'Moderate', 'Hard']
