import type {
  FullBodySegmentId,
  GuidedMovement,
  GuidedSegmentDefinition,
} from '../types/fullBodySession'

/** Default countdown when a rep-based movement has no explicit duration. */
export const GUIDED_REP_DEFAULT_SECONDS = 50

export function movementDurationSeconds(movement: GuidedMovement): number {
  return movement.durationSeconds ?? GUIDED_REP_DEFAULT_SECONDS
}

export const FULL_BODY_MAIN_LIFT_SLOT_IDS = [
  'full_body-1',
  'full_body-2',
  'full_body-3',
  'full_body-4',
  'full_body-5',
  'full_body-6',
] as const

export const WARMUP_SEGMENT: GuidedSegmentDefinition = {
  id: 'warmup',
  title: 'Warm-up',
  exerciseId: 'segment-warmup',
  catalogExerciseId: 'warmup_segment',
  estimatedMinutes: 5,
  movements: [
    {
      id: 'warmup-arm-circles',
      name: 'Arm circles',
      mode: 'time',
      durationSeconds: 40,
      target: 'Shoulders',
    },
    {
      id: 'warmup-leg-swings',
      name: 'Leg swings',
      mode: 'time',
      durationSeconds: 40,
      target: 'Hips',
    },
    {
      id: 'warmup-squat-to-stand',
      name: 'Bodyweight squat to stand',
      mode: 'reps',
      durationSeconds: 50,
      repTarget: '10–15 reps',
      target: 'Squat prep',
    },
    {
      id: 'warmup-glute-bridge',
      name: 'Glute bridges',
      mode: 'reps',
      durationSeconds: 45,
      repTarget: '10–15 reps',
      target: 'Hip hinge prep',
    },
  ],
}

export const CORE_GUIDED_SEGMENT: GuidedSegmentDefinition = {
  id: 'core',
  title: 'Core',
  exerciseId: 'segment-core',
  catalogExerciseId: 'core_segment',
  estimatedMinutes: 8,
  movements: [
    {
      id: 'core-plank',
      name: 'Weighted plank',
      mode: 'time',
      durationSeconds: 40,
      target: 'Anti-extension',
    },
    {
      id: 'core-hanging-leg-raise',
      name: 'Hanging leg raise',
      mode: 'reps',
      durationSeconds: 50,
      repTarget: '8–12 reps',
      target: 'Hip flexion',
    },
    {
      id: 'core-plank-2',
      name: 'Weighted plank',
      mode: 'time',
      durationSeconds: 40,
      target: 'Set 2',
    },
    {
      id: 'core-hanging-leg-raise-2',
      name: 'Hanging leg raise',
      mode: 'reps',
      durationSeconds: 50,
      repTarget: '8–12 reps',
      target: 'Set 2',
    },
  ],
}

export const MOBILITY_SEGMENT: GuidedSegmentDefinition = {
  id: 'mobility',
  title: 'Mobility',
  exerciseId: 'segment-mobility',
  catalogExerciseId: 'mobility_segment',
  estimatedMinutes: 5,
  movements: [
    {
      id: 'mobility-wgs',
      name: "World's Greatest Stretch",
      mode: 'time',
      durationSeconds: 40,
      target: 'Hips, T-spine',
    },
    {
      id: 'mobility-9090',
      name: '90/90 hip switch',
      mode: 'time',
      durationSeconds: 40,
      target: 'Hip rotation',
    },
    {
      id: 'mobility-t-spine',
      name: 'Thoracic rotation',
      mode: 'time',
      durationSeconds: 35,
      target: 'Upper back',
    },
    {
      id: 'mobility-ankle',
      name: 'Ankle rocks',
      mode: 'time',
      durationSeconds: 35,
      target: 'Dorsiflexion',
    },
  ],
}

export const GUIDED_SEGMENTS: GuidedSegmentDefinition[] = [
  WARMUP_SEGMENT,
  CORE_GUIDED_SEGMENT,
  MOBILITY_SEGMENT,
]

export function getGuidedSegmentDefinition(
  id: Exclude<FullBodySegmentId, 'main'>,
): GuidedSegmentDefinition {
  const segment = GUIDED_SEGMENTS.find((item) => item.id === id)
  if (!segment) throw new Error(`Unknown guided segment: ${id}`)
  return segment
}

export const MAIN_LIFTS_TRANSITION = {
  title: 'Main lifts',
  subtitle: '6 exercises · ~34 min',
  description: 'Logged sets with suggested weight and progression coaching.',
}

export function segmentTransitionAfter(segmentId: FullBodySegmentId) {
  if (segmentId === 'warmup') return MAIN_LIFTS_TRANSITION
  if (segmentId === 'main') {
    return {
      title: 'Core',
      subtitle: `${CORE_GUIDED_SEGMENT.movements.length} rounds · ~${CORE_GUIDED_SEGMENT.estimatedMinutes} min`,
      description: 'Guided timer — one log for the core block.',
    }
  }
  if (segmentId === 'core') {
    return {
      title: 'Mobility',
      subtitle: `${MOBILITY_SEGMENT.movements.length} movements · ~${MOBILITY_SEGMENT.estimatedMinutes} min`,
      description: 'Static holds and flow to finish the session.',
    }
  }
  return null
}
