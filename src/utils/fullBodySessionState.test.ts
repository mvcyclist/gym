import { describe, expect, it } from 'vitest'
import type { WorkoutSession } from '../types/workout'
import {
  canJumpToSegment,
  hasWorkoutProgress,
  isStructuredFullBodySession,
  mainLiftExerciseIds,
  reconcileFullBodySegment,
} from './fullBodySessionState'

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'full_body-1',
    workoutType: 'full_body',
    status: 'active',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    exercises: [
      {
        exerciseId: 'full_body-1',
        catalogExerciseId: 'back_squat',
        exerciseName: 'Back squat',
        sets: [{ setNumber: 1, weight: '135', reps: '8', completed: true, completedAt: null }],
      },
    ],
    fullBody: {
      currentSegment: 'warmup',
      guidedMovementIndex: 0,
      guidedSegmentStartedAt: null,
    },
    ...overrides,
  }
}

describe('fullBodySessionState', () => {
  it('detects structured full body sessions', () => {
    expect(isStructuredFullBodySession(makeSession())).toBe(true)
    expect(isStructuredFullBodySession(makeSession({ fullBody: undefined }))).toBe(false)
  })

  it('tracks progress from guided segments and lift sets', () => {
    expect(hasWorkoutProgress(makeSession())).toBe(true)

    const guidedOnly = makeSession({
      exercises: [
        {
          exerciseId: 'segment-warmup',
          catalogExerciseId: 'warmup_segment',
          exerciseName: 'Warm-up',
          sets: [],
          isGuidedSegment: true,
          segmentDurationSeconds: 240,
          segmentStatus: 'completed',
        },
      ],
    })
    expect(hasWorkoutProgress(guidedOnly)).toBe(true)

    const empty = makeSession({
      exercises: [
        {
          exerciseId: 'full_body-1',
          catalogExerciseId: 'back_squat',
          exerciseName: 'Back squat',
          sets: [{ setNumber: 1, weight: '', reps: '', completed: false, completedAt: null }],
        },
      ],
    })
    expect(hasWorkoutProgress(empty)).toBe(false)
  })

  it('limits segment jumps to completed and current segments', () => {
    const session = makeSession({
      fullBody: { currentSegment: 'main', guidedMovementIndex: 0 },
      exercises: [
        ...makeSession().exercises,
        {
          exerciseId: 'segment-warmup',
          catalogExerciseId: 'warmup_segment',
          exerciseName: 'Warm-up',
          sets: [],
          isGuidedSegment: true,
          segmentDurationSeconds: 300,
          segmentStatus: 'completed',
        },
      ],
    })

    expect(canJumpToSegment(session, 'warmup')).toBe(true)
    expect(canJumpToSegment(session, 'main')).toBe(true)
    expect(canJumpToSegment(session, 'core')).toBe(false)
  })

  it('lists only main lift exercise ids', () => {
    const session = makeSession({
      exercises: [
        {
          exerciseId: 'segment-warmup',
          catalogExerciseId: 'warmup_segment',
          exerciseName: 'Warm-up',
          sets: [],
          isGuidedSegment: true,
          segmentStatus: 'completed',
        },
        {
          exerciseId: 'full_body-1',
          catalogExerciseId: 'back_squat',
          exerciseName: 'Back squat',
          sets: [],
        },
      ],
    })

    expect(mainLiftExerciseIds(session)).toEqual(['full_body-1'])
  })

  it('reconciles past completed guided segments on resume', () => {
    const session = makeSession({
      fullBody: { currentSegment: 'core', guidedMovementIndex: 0 },
      exercises: [
        {
          exerciseId: 'segment-warmup',
          catalogExerciseId: 'warmup_segment',
          exerciseName: 'Warm-up',
          sets: [],
          isGuidedSegment: true,
          segmentStatus: 'completed',
        },
        {
          exerciseId: 'segment-core',
          catalogExerciseId: 'core_segment',
          exerciseName: 'Core',
          sets: [],
          isGuidedSegment: true,
          segmentStatus: 'completed',
        },
        ...makeSession().exercises,
      ],
    })

    expect(reconcileFullBodySegment(session)).toBe('mobility')
  })
})
