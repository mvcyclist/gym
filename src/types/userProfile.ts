import type { WorkoutCategory } from './workout'
import type { Exercise } from './workout'

export type EquipmentKey =
  | 'barbell'
  | 'rack'
  | 'bench'
  | 'dumbbells'
  | 'pullup'
  | 'trx'
  | 'cables'
  | 'bodyweight'

export type CardioModalityKey = 'swim' | 'bike' | 'run' | 'walk' | 'hiit' | 'none'

export type OnboardingStep = 1 | 2 | 3 | 4

export type ProgramType = 'ppl' | 'full_body'

export type StrengthTemplateKey = Extract<
  WorkoutCategory,
  'push' | 'pull' | 'leg' | 'core' | 'full_body'
>

/** Where strength templates are resolved from. */
export type TemplateSource = 'history' | 'default' | 'generated' | 'random'

export interface GeneratedWorkoutTemplates {
  push: Exercise[]
  pull: Exercise[]
  leg: Exercise[]
  core: Exercise[]
}

/** One planned activity for a calendar weekday (Sun=0 … Sat=6). */
export interface WeeklyPlanSlot {
  type: import('./training').ActivityType
  label: string
  meta?: string
}

export interface UserProfile {
  /** Strength program layout; defaults to PPL for existing profiles. */
  programType?: ProgramType
  equipment: EquipmentKey[]
  /** Set when barbell+bench without rack; null if question not shown. */
  canBench: boolean | null
  cardioModalities: CardioModalityKey[]
  wantsMobility: boolean
  wantsCore: boolean
  onboardingComplete: boolean
  onboardingStep?: OnboardingStep
  /** Draft selections while onboarding is in progress. */
  onboardingDraft?: {
    equipment?: EquipmentKey[]
    canBench?: boolean | null
    cardioModalities?: CardioModalityKey[]
    wantsMobility?: boolean
    wantsCore?: boolean
  }
  generatedTemplates?: GeneratedWorkoutTemplates
  defaultWeeklyPlan?: WeeklyPlanSlot[]
  /** Per-category template source; defaults to history when available. */
  templateSources?: Partial<Record<StrengthTemplateKey, TemplateSource>>
  /** Completed profile snapshot while editing routine; restored on cancel. */
  editRoutineSnapshot?: UserProfile
}

export function getProgramType(profile: UserProfile): ProgramType {
  return profile.programType ?? 'ppl'
}

export const EQUIPMENT_OPTIONS: Array<{
  key: EquipmentKey
  icon: string
  name: string
  description: string
}> = [
  { key: 'barbell', icon: '🏋️', name: 'Barbell', description: 'Rows, deadlifts, OHP, curls. The foundation of most strength work.' },
  { key: 'rack', icon: '🗜️', name: 'Squat rack / power rack', description: 'Needed for bench press and back squats. Separate from having a barbell.' },
  { key: 'bench', icon: '🛋️', name: 'Bench', description: 'Flat or adjustable. Needed for pressing movements and incline work.' },
  { key: 'dumbbells', icon: '💪', name: 'Dumbbells', description: 'Presses, lateral raises, curls, rows, split squats.' },
  { key: 'pullup', icon: '🔗', name: 'Pull-up bar', description: 'Pull-ups, chin-ups, hanging core work.' },
  { key: 'trx', icon: '🎯', name: 'TRX / suspension trainer', description: 'Rows, pikes, tricep work, atomic push-ups.' },
  { key: 'cables', icon: '🔌', name: 'Cable machine', description: 'Face pulls, cable rows, pulldowns, cable curls.' },
  { key: 'bodyweight', icon: '🤸', name: 'Bodyweight only', description: 'Push-ups, dips, planks, no equipment needed.' },
]

export const CARDIO_OPTIONS: Array<{
  key: CardioModalityKey
  icon: string
  name: string
  description: string
}> = [
  { key: 'swim', icon: '🏊', name: 'Swim', description: 'Pool sessions, laps, open water' },
  { key: 'bike', icon: '🚴', name: 'Bike', description: 'Road, trail, or indoor cycling' },
  { key: 'run', icon: '🏃', name: 'Run', description: 'Road, trail, or treadmill' },
  { key: 'walk', icon: '🚶', name: 'Walk', description: 'Daily walks, hiking, active recovery' },
  { key: 'hiit', icon: '⚡', name: 'HIIT', description: 'Intervals, circuits, high intensity' },
  { key: 'none', icon: '⛔', name: 'None for now', description: 'Strength only — you can add cardio later' },
]

export function needsBenchClarifier(equipment: EquipmentKey[]): boolean {
  return (
    equipment.includes('barbell') &&
    equipment.includes('bench') &&
    !equipment.includes('rack')
  )
}

export function emptyUserProfile(): UserProfile {
  return {
    equipment: [],
    canBench: null,
    cardioModalities: [],
    wantsMobility: true,
    wantsCore: true,
    onboardingComplete: false,
    onboardingStep: 1,
  }
}
