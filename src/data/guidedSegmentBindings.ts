import type { FullBodySegmentId } from '../types/fullBodySession'

export type GuidedSegmentId = Exclude<FullBodySegmentId, 'main'>

export interface GuidedSegmentBinding {
  exerciseId: string
  catalogExerciseId: string
  title: string
  defaultRoutineId: string
}

export const GUIDED_SEGMENT_BINDINGS: Record<GuidedSegmentId, GuidedSegmentBinding> = {
  warmup: {
    exerciseId: 'segment-warmup',
    catalogExerciseId: 'warmup_segment',
    title: 'Warm-up',
    defaultRoutineId: 'full_body_warmup_v1',
  },
  core: {
    exerciseId: 'segment-core',
    catalogExerciseId: 'core_segment',
    title: 'Core',
    defaultRoutineId: 'full_body_core_v1',
  },
  mobility: {
    exerciseId: 'segment-mobility',
    catalogExerciseId: 'mobility_segment',
    title: 'Mobility',
    defaultRoutineId: 'full_body_mobility_v1',
  },
}

export function getGuidedSegmentBinding(segmentId: GuidedSegmentId): GuidedSegmentBinding {
  return GUIDED_SEGMENT_BINDINGS[segmentId]
}
