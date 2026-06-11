export type WorkoutCategory = 'push' | 'pull' | 'leg' | 'core'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'complete'

export type SessionStatus = 'active' | 'paused' | 'completed' | 'partial' | 'abandoned'

export interface Exercise {
  id: string
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
  exerciseName: string
  sets: SetLog[]
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
}

export interface AppState {
  selectedWorkoutType: WorkoutCategory | null
  currentExerciseIndex: number
  timerDuration: number
  timerRemaining: number
  timerStatus: TimerStatus
  muted: boolean
}
