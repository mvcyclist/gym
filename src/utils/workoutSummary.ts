import { getWorkoutById } from '../data/workouts'
import type { DayActivity } from '../types/training'
import type { WorkoutCategory, WorkoutSession } from '../types/workout'
import {
  countCompletedSets,
  countExercisesWithCompletedSets,
  countTotalSets,
  getSessionDurationMinutes,
} from './sessionMetrics'

export interface WorkoutSessionSummary {
  workoutTitle: string
  workoutType: WorkoutCategory
  status: 'completed' | 'partial'
  durationMinutes?: number
  completedSets: number
  totalSets: number
  exercisesLogged: number
  exerciseCount: number
  highlights: Array<{ name: string; completedSets: number }>
}

export interface TodayActivitySummary {
  kind: 'activities'
  title: string
  lines: string[]
}

export type TodaySummary = WorkoutSessionSummary | TodayActivitySummary

export function buildWorkoutSessionSummary(session: WorkoutSession): WorkoutSessionSummary {
  const workout = getWorkoutById(session.workoutType)
  const highlights = session.exercises
    .map((exercise) => ({
      name: exercise.exerciseName,
      completedSets: exercise.sets.filter((set) => set.completed).length,
    }))
    .filter((item) => item.completedSets > 0)
    .slice(0, 4)

  return {
    workoutTitle: workout?.title ?? session.workoutType,
    workoutType: session.workoutType,
    status: session.status === 'partial' ? 'partial' : 'completed',
    durationMinutes: getSessionDurationMinutes(session),
    completedSets: countCompletedSets(session),
    totalSets: countTotalSets(session),
    exercisesLogged: countExercisesWithCompletedSets(session),
    exerciseCount: session.exercises.length,
    highlights,
  }
}

export function buildTodayActivitySummary(day: DayActivity): TodayActivitySummary {
  const lines = day.activities.map((activity) => {
    const intensity = activity.intensity ? ` · ${activity.intensity}` : ''
    const status =
      activity.sessionStatus === 'partial'
        ? ' (partial)'
        : activity.sessionStatus === 'completed'
          ? ''
          : ''
    return `${activity.type}${intensity}${status}`
  })

  return {
    kind: 'activities',
    title: 'Activity logged today',
    lines,
  }
}

export function isSessionSummary(summary: TodaySummary): summary is WorkoutSessionSummary {
  return !('kind' in summary)
}
