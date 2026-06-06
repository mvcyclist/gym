import { useCallback, useState } from 'react'
import { getWorkoutById } from '../data/workouts'
import {
  getSessionById,
  recordCompletedWorkout,
  recordPartialWorkout,
  removeSession,
  upsertSession,
} from '../services/trainingLedgerService'
import type { ExerciseLog, SetLog, WorkoutCategory, WorkoutSession } from '../types/workout'

const DEFAULT_SET_COUNT = 3
const MIN_SET_COUNT = 1

function createEmptySet(setNumber: number): SetLog {
  return {
    setNumber,
    weight: '',
    reps: '',
    completed: false,
    completedAt: null,
  }
}

function createDefaultSets(count = DEFAULT_SET_COUNT): SetLog[] {
  return Array.from({ length: count }, (_, index) => createEmptySet(index + 1))
}

function renumberSets(sets: SetLog[]): SetLog[] {
  return sets.map((set, index) => ({
    ...set,
    setNumber: index + 1,
  }))
}

function createExerciseLogs(workoutType: WorkoutCategory): ExerciseLog[] {
  const workout = getWorkoutById(workoutType)
  if (!workout) return []

  return workout.exercises.map((exercise) => ({
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets: createDefaultSets(),
  }))
}

function createSession(workoutType: WorkoutCategory): WorkoutSession {
  const now = new Date().toISOString()
  return {
    id: `${workoutType}-${Date.now()}`,
    workoutType,
    status: 'active',
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    exercises: createExerciseLogs(workoutType),
  }
}

interface UseWorkoutLogReturn {
  session: WorkoutSession | null
  startSession: (workoutType: WorkoutCategory) => WorkoutSession
  resumeSession: (sessionId: string) => WorkoutSession | null
  updateSet: (
    exerciseId: string,
    setNumber: number,
    updates: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  completeSet: (exerciseId: string, setNumber: number) => void
  addSet: (exerciseId: string) => void
  deleteSet: (exerciseId: string, setNumber: number) => void
  getExerciseLog: (exerciseId: string) => ExerciseLog | undefined
  finishWorkout: () => Promise<WorkoutSession | null>
  savePartialWorkout: () => Promise<WorkoutSession | null>
  discardActiveWorkout: () => void
  clearSession: () => void
}

export function useWorkoutLog(): UseWorkoutLogReturn {
  const [session, setSession] = useState<WorkoutSession | null>(null)

  const persistSession = useCallback((nextSession: WorkoutSession) => {
    const updatedSession = {
      ...nextSession,
      updatedAt: new Date().toISOString(),
    }
    void upsertSession(updatedSession).catch((error) => {
      console.error('[workout] failed to sync session', error)
    })
    setSession(updatedSession)
    return updatedSession
  }, [])

  const startSession = useCallback(
    (workoutType: WorkoutCategory) => {
      const nextSession = createSession(workoutType)
      void upsertSession(nextSession).catch((error) => {
        console.error('[workout] failed to sync session', error)
      })
      setSession(nextSession)
      return nextSession
    },
    [],
  )

  const resumeSession = useCallback((sessionId: string) => {
    const existing = getSessionById(sessionId)
    if (!existing) return null
    setSession(existing)
    return existing
  }, [])

  const updateSet = useCallback(
    (
      exerciseId: string,
      setNumber: number,
      updates: Partial<Pick<SetLog, 'weight' | 'reps'>>,
    ) => {
      if (!session) return

      const nextSession: WorkoutSession = {
        ...session,
        exercises: session.exercises.map((exerciseLog) => {
          if (exerciseLog.exerciseId !== exerciseId) return exerciseLog

          return {
            ...exerciseLog,
            sets: exerciseLog.sets.map((setLog) =>
              setLog.setNumber === setNumber ? { ...setLog, ...updates } : setLog,
            ),
          }
        }),
      }

      persistSession(nextSession)
    },
    [persistSession, session],
  )

  const completeSet = useCallback(
    (exerciseId: string, setNumber: number) => {
      if (!session) return

      const nextSession: WorkoutSession = {
        ...session,
        exercises: session.exercises.map((exerciseLog) => {
          if (exerciseLog.exerciseId !== exerciseId) return exerciseLog

          return {
            ...exerciseLog,
            sets: exerciseLog.sets.map((setLog) =>
              setLog.setNumber === setNumber
                ? {
                    ...setLog,
                    completed: true,
                    completedAt: new Date().toISOString(),
                  }
                : setLog,
            ),
          }
        }),
      }

      persistSession(nextSession)
    },
    [persistSession, session],
  )

  const addSet = useCallback(
    (exerciseId: string) => {
      if (!session) return

      const nextSession: WorkoutSession = {
        ...session,
        exercises: session.exercises.map((exerciseLog) => {
          if (exerciseLog.exerciseId !== exerciseId) return exerciseLog

          const lastSet = exerciseLog.sets.at(-1)
          const nextSetNumber = exerciseLog.sets.length + 1
          const newSet: SetLog = lastSet
            ? {
                ...createEmptySet(nextSetNumber),
                weight: lastSet.weight,
                reps: lastSet.reps,
              }
            : createEmptySet(nextSetNumber)

          return {
            ...exerciseLog,
            sets: [...exerciseLog.sets, newSet],
          }
        }),
      }

      persistSession(nextSession)
    },
    [persistSession, session],
  )

  const deleteSet = useCallback(
    (exerciseId: string, setNumber: number) => {
      if (!session) return

      const nextSession: WorkoutSession = {
        ...session,
        exercises: session.exercises.map((exerciseLog) => {
          if (exerciseLog.exerciseId !== exerciseId) return exerciseLog
          if (exerciseLog.sets.length <= MIN_SET_COUNT) return exerciseLog

          return {
            ...exerciseLog,
            sets: renumberSets(exerciseLog.sets.filter((setLog) => setLog.setNumber !== setNumber)),
          }
        }),
      }

      persistSession(nextSession)
    },
    [persistSession, session],
  )

  const getExerciseLog = useCallback(
    (exerciseId: string) => session?.exercises.find((log) => log.exerciseId === exerciseId),
    [session],
  )

  const finishWorkout = useCallback(async () => {
    if (!session) return null
    const completed: WorkoutSession = {
      ...session,
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await recordCompletedWorkout(completed)
    setSession(completed)
    return completed
  }, [session])

  const savePartialWorkout = useCallback(async () => {
    if (!session) return null
    const partial: WorkoutSession = {
      ...session,
      status: 'partial',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await recordPartialWorkout(partial)
    setSession(partial)
    return partial
  }, [session])

  const discardActiveWorkout = useCallback(() => {
    if (!session) return
    removeSession(session.id)
    setSession(null)
  }, [session])

  const clearSession = useCallback(() => {
    setSession(null)
  }, [])

  return {
    session,
    startSession,
    resumeSession,
    updateSet,
    completeSet,
    addSet,
    deleteSet,
    getExerciseLog,
    finishWorkout,
    savePartialWorkout,
    discardActiveWorkout,
    clearSession,
  }
}
