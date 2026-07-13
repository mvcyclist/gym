export type FullBodySegmentId = 'warmup' | 'main' | 'core' | 'mobility'

export type GuidedMovementMode = 'time' | 'reps'

export type GuidedSegmentStatus = 'completed' | 'partial'

export interface GuidedMovement {
  id: string
  name: string
  mode: GuidedMovementMode
  /** Seconds for time-based movements. */
  durationSeconds?: number
  /** Display string e.g. "10–15 reps". */
  repTarget?: string
  target?: string
}

export interface GuidedSegmentDefinition {
  id: Exclude<FullBodySegmentId, 'main'>
  title: string
  exerciseId: string
  catalogExerciseId: string
  estimatedMinutes: number
  movements: GuidedMovement[]
}

export interface FullBodySessionState {
  currentSegment: FullBodySegmentId
  /** When the user started the active phase of the current guided segment. */
  guidedSegmentStartedAt?: string | null
  /** Resume position within the active guided audio routine. */
  playbackPositionSeconds?: number
  /** Segment just finished — show interstitial before entering currentSegment. */
  awaitingSegmentContinue?: FullBodySegmentId | null
}

export const FULL_BODY_SEGMENT_ORDER: FullBodySegmentId[] = [
  'warmup',
  'main',
  'core',
  'mobility',
]

export const SEGMENT_EXERCISE_IDS: Record<
  Exclude<FullBodySegmentId, 'main'>,
  string
> = {
  warmup: 'segment-warmup',
  core: 'segment-core',
  mobility: 'segment-mobility',
}
