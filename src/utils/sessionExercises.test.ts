import { describe, expect, it } from 'vitest'
import type { WorkoutSession } from '../types/workout'
import { buildDisplayExercisesForSession } from './sessionExercises'
import { getSessionCalendarDate } from './sessionMetrics'

describe('buildDisplayExercisesForSession', () => {
  it('uses catalog and name from session logs, not current template slot mapping', () => {
    const session: WorkoutSession = {
      id: 'push-1',
      workoutType: 'push',
      status: 'active',
      startedAt: '2026-06-22T18:00:00.000Z',
      updatedAt: '2026-06-22T18:00:00.000Z',
      completedAt: null,
      exercises: [
        {
          exerciseId: 'push-2',
          catalogExerciseId: 'barbell_bench_press',
          exerciseName: 'Barbell Bench Press',
          sets: [],
        },
      ],
      exerciseOrder: ['push-2'],
    }

    const exercises = buildDisplayExercisesForSession(session)
    expect(exercises).toHaveLength(1)
    expect(exercises[0]?.id).toBe('push-2')
    expect(exercises[0]?.catalogExerciseId).toBe('barbell_bench_press')
    expect(exercises[0]?.name).toBe('Barbell Bench Press')
  })

  it('keeps skipped exercises in the plan list', () => {
    const session: WorkoutSession = {
      id: 'full_body-1',
      workoutType: 'full_body',
      status: 'active',
      startedAt: '2026-06-22T18:00:00.000Z',
      updatedAt: '2026-06-22T18:00:00.000Z',
      completedAt: null,
      exercises: [
        {
          exerciseId: 'full_body-1',
          catalogExerciseId: 'worlds_greatest_stretch',
          exerciseName: "World's Greatest Stretch",
          sets: [{ setNumber: 1, weight: '', reps: '30', completed: true, completedAt: 't' }],
        },
        {
          exerciseId: 'full_body-2',
          catalogExerciseId: 'hip_90_90_switch',
          exerciseName: '90/90 Hip Switch',
          sets: [],
          skipped: true,
        },
        {
          exerciseId: 'full_body-3',
          catalogExerciseId: 'thoracic_rotation',
          exerciseName: 'Thoracic Rotation',
          sets: [],
        },
      ],
      exerciseOrder: ['full_body-1', 'full_body-2', 'full_body-3'],
    }

    const exercises = buildDisplayExercisesForSession(session)
    expect(exercises.map((e) => e.id)).toEqual([
      'full_body-1',
      'full_body-2',
      'full_body-3',
    ])
  })
})

describe('getSessionCalendarDate', () => {
  it('uses startedAt for completed sessions', () => {
    const session: WorkoutSession = {
      id: 'push-1',
      workoutType: 'push',
      status: 'completed',
      startedAt: '2026-06-22T18:00:00.000Z',
      updatedAt: '2026-06-23T01:00:00.000Z',
      completedAt: '2026-06-23T01:00:00.000Z',
      exercises: [],
    }

    expect(getSessionCalendarDate(session)).toBe('2026-06-22')
  })
})
