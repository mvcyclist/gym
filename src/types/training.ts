export type ActivityType =
  | 'Push'
  | 'Pull'
  | 'Leg'
  | 'Core'
  | 'Mobility'
  | 'Swim'
  | 'Bike'
  | 'Run'
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
  distanceMeters?: number
  distanceMiles?: number
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
  'Run',
  'Walk',
  'Rest',
  'Other',
]

export const INTENSITY_LEVELS: Intensity[] = ['Easy', 'Moderate', 'Hard']

// ─── Recommendation engine types ─────────────────────────────────────────────

export type WorkoutType =
  | 'Push'
  | 'Pull'
  | 'Leg'
  | 'Core'
  | 'Run'
  | 'Bike'
  | 'Swim'
  | 'Walk'
  | 'Mobility'
  | 'Rest'

export type QualityBucket = 'Best' | 'Good' | 'Marginal' | 'Skip'

export interface LoadProfile {
  type: WorkoutType
  recoveryHours: number
  legPoolContribution: number
  isHardSession: boolean
  isLowLoad: boolean
  addonEligible: boolean
}

export const LOAD_PROFILES: Record<WorkoutType, LoadProfile> = {
  Push:     { type: 'Push',     recoveryHours: 60, legPoolContribution: 0, isHardSession: true,  isLowLoad: false, addonEligible: false },
  Pull:     { type: 'Pull',     recoveryHours: 60, legPoolContribution: 0, isHardSession: true,  isLowLoad: false, addonEligible: false },
  Leg:      { type: 'Leg',      recoveryHours: 72, legPoolContribution: 3, isHardSession: true,  isLowLoad: false, addonEligible: false },
  Core:     { type: 'Core',     recoveryHours: 30, legPoolContribution: 0, isHardSession: false, isLowLoad: false, addonEligible: true  },
  Run:      { type: 'Run',      recoveryHours: 48, legPoolContribution: 2, isHardSession: true,  isLowLoad: false, addonEligible: false },
  Bike:     { type: 'Bike',     recoveryHours: 36, legPoolContribution: 1, isHardSession: true,  isLowLoad: false, addonEligible: false },
  Swim:     { type: 'Swim',     recoveryHours: 24, legPoolContribution: 0, isHardSession: true,  isLowLoad: false, addonEligible: false },
  Walk:     { type: 'Walk',     recoveryHours: 0,  legPoolContribution: 0, isHardSession: false, isLowLoad: true,  addonEligible: false },
  Mobility: { type: 'Mobility', recoveryHours: 0,  legPoolContribution: 0, isHardSession: false, isLowLoad: true,  addonEligible: true  },
  Rest:     { type: 'Rest',     recoveryHours: 0,  legPoolContribution: 0, isHardSession: false, isLowLoad: true,  addonEligible: false },
}

export interface UserPalette {
  types: WorkoutType[]
}

export const DEFAULT_PALETTE: UserPalette = {
  types: ['Push', 'Pull', 'Leg', 'Core', 'Run', 'Swim', 'Bike', 'Walk', 'Mobility', 'Rest'],
}

export interface ScoredWorkout {
  type: WorkoutType
  score: number
  bucket: QualityBucket
  reason: string
  warning?: string
}

export interface AddonSuggestion {
  type: 'Core' | 'Mobility'
  daysSinceLast: number
  suggestedDurationMinutes: number
  reason: string
}

export interface RecommendationResult {
  primary: ScoredWorkout
  addon: AddonSuggestion | null
  alternatives: ScoredWorkout[]
  restUrgency: boolean
  legFatiguePool: number
  hardSessionCount: number
}
