import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { WorkoutSession } from '../types/workout'
import type { WorkoutCategory } from '../types/workout'
import { emptyUserProfile } from '../types/userProfile'
import {
  buildExercisesFromHistory,
  defaultTemplateSources,
  resolveTemplateSource,
} from './workoutTemplateService'

const mockSession = vi.fn((_type: WorkoutCategory): WorkoutSession | null => null)

vi.mock('./exerciseHistoryService', () => ({
  getLastCompletedSessionByWorkoutType: (type: WorkoutCategory) => mockSession(type),
}))

describe('buildExercisesFromHistory', () => {
  beforeEach(() => {
    mockSession.mockReset()
  })

  it('reconstructs exercises from last session order', () => {
    mockSession.mockReturnValue({
      id: 's1',
      workoutType: 'push',
      status: 'completed',
      startedAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T11:00:00Z',
      completedAt: '2026-01-01T11:00:00Z',
      exerciseOrder: ['push-1', 'push-3'],
      exercises: [
        {
          exerciseId: 'push-1',
          catalogExerciseId: 'barbell_bench_press',
          exerciseName: 'Barbell Bench Press',
          sets: [],
        },
        {
          exerciseId: 'push-3',
          catalogExerciseId: 'overhead_press',
          exerciseName: 'Overhead Press',
          sets: [],
        },
      ],
    })

    const exercises = buildExercisesFromHistory('push')
    expect(exercises).not.toBeNull()
    expect(exercises!.map((e) => e.catalogExerciseId)).toEqual([
      'barbell_bench_press',
      'overhead_press',
    ])
  })

  it('excludes guided Full Body segment placeholders from main lifts', () => {
    mockSession.mockReturnValue({
      id: 's-fb',
      workoutType: 'full_body',
      status: 'completed',
      startedAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T11:00:00Z',
      completedAt: '2026-01-01T11:00:00Z',
      exerciseOrder: [
        'segment-warmup',
        'full_body-1',
        'full_body-2',
        'segment-core',
        'segment-mobility',
      ],
      exercises: [
        {
          exerciseId: 'segment-warmup',
          catalogExerciseId: 'warmup_segment',
          exerciseName: 'Warm-up',
          sets: [],
        },
        {
          exerciseId: 'full_body-1',
          catalogExerciseId: 'barbell_back_squat',
          exerciseName: 'Barbell Back Squat',
          sets: [],
        },
        {
          exerciseId: 'full_body-2',
          catalogExerciseId: 'barbell_bench_press',
          exerciseName: 'Barbell Bench Press',
          sets: [],
        },
        {
          exerciseId: 'segment-core',
          catalogExerciseId: 'core_segment',
          exerciseName: 'Core',
          sets: [],
        },
        {
          exerciseId: 'segment-mobility',
          catalogExerciseId: 'mobility_segment',
          exerciseName: 'Mobility',
          sets: [],
        },
      ],
    })

    const exercises = buildExercisesFromHistory('full_body')
    expect(exercises).not.toBeNull()
    expect(exercises!.map((e) => e.catalogExerciseId)).toEqual([
      'barbell_back_squat',
      'barbell_bench_press',
    ])
    expect(exercises!.map((e) => e.name)).not.toContain('Warm-up')
    expect(exercises!.map((e) => e.name)).not.toContain('Core')
    expect(exercises!.map((e) => e.name)).not.toContain('Mobility')
  })
})

describe('resolveTemplateSource', () => {
  it('prefers history when sessions exist', () => {
    mockSession.mockReturnValue({
      id: 's1',
      workoutType: 'push',
      status: 'completed',
      startedAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T11:00:00Z',
      completedAt: '2026-01-01T11:00:00Z',
      exercises: [{ exerciseId: 'push-1', catalogExerciseId: 'barbell_bench_press', exerciseName: 'Bench', sets: [] }],
    })

    const profile = { ...emptyUserProfile(), onboardingComplete: true, equipment: ['barbell' as const] }
    expect(resolveTemplateSource('push', profile)).toBe('history')
  })

  it('respects explicit templateSources selection', () => {
    mockSession.mockReturnValue(null)
    const profile = {
      ...emptyUserProfile(),
      onboardingComplete: true,
      equipment: ['dumbbells' as const],
      templateSources: { push: 'default' as const },
    }
    expect(resolveTemplateSource('push', profile)).toBe('default')
  })

  it('defaults all categories with history to history', () => {
    mockSession.mockImplementation((type: WorkoutCategory) =>
      type === 'push'
        ? ({
            id: 's1',
            workoutType: 'push',
            status: 'completed',
            startedAt: '2026-01-01T10:00:00Z',
            updatedAt: '2026-01-01T11:00:00Z',
            completedAt: '2026-01-01T11:00:00Z',
            exercises: [{ exerciseId: 'push-1', catalogExerciseId: 'barbell_bench_press', exerciseName: 'Bench', sets: [] }],
          } satisfies WorkoutSession)
        : null,
    )

    const sources = defaultTemplateSources({ ...emptyUserProfile(), onboardingComplete: true })
    expect(sources.push).toBe('history')
    expect(sources.pull).toBe('default')
  })
})
