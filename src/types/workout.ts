export type WorkoutCategory = 'push' | 'pull' | 'leg' | 'core' | 'full_body'

export type { FullBodySessionState, GuidedSegmentStatus } from './fullBodySession'
import type { FullBodySessionState, GuidedSegmentStatus } from './fullBodySession'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'complete'

export type SessionStatus = 'active' | 'paused' | 'completed' | 'partial' | 'abandoned'

export interface Exercise {
  id: string
  /** Immutable catalog id for history/coaching (Option A). */
  catalogExerciseId: string
  name: string
  primaryMuscles: string[]
  equipment: string
  sets: string
  reps: string
  suggestedRestSeconds: number
  instructions: string
  cues: string
  commonMistakes: string
}

export interface WorkoutType {
  id: WorkoutCategory
  title: string
  description: string
  estimatedDuration: string
  exercises: Exercise[]
}

export interface SetLog {
  setNumber: number
  weight: string
  reps: string
  completed: boolean
  completedAt: string | null
}

export interface ExerciseLog {
  exerciseId: string
  /** Immutable catalog id — required on new logs; optional on legacy rows. */
  catalogExerciseId?: string
  exerciseName: string
  sets: SetLog[]
  skipped?: boolean
  /** Guided segment (warm-up / core / mobility) — one log per segment. */
  isGuidedSegment?: boolean
  segmentDurationSeconds?: number
  segmentStatus?: GuidedSegmentStatus
}

export interface WorkoutSession {
  id: string
  workoutType: WorkoutCategory
  status: SessionStatus
  startedAt: string
  updatedAt: string
  completedAt: string | null
  /** Accumulated workout time (ms) before the current running segment. */
  workoutElapsedMs?: number
  /** ISO timestamp when the elapsed timer last started/resumed; null while paused. */
  workoutTimerStartedAt?: string | null
  exercises: ExerciseLog[]
  /** Custom exercise ordering/filtering — IDs in the order to show them. If absent, use template order. */
  exerciseOrder?: string[]
  /** Structured full-body flow (warm-up → main → core → mobility). */
  fullBody?: FullBodySessionState
}

export interface AppState {
  selectedWorkoutType: WorkoutCategory | null
  currentExerciseIndex: number
  timerDuration: number
  timerRemaining: number
  timerStatus: TimerStatus
  muted: boolean
}
