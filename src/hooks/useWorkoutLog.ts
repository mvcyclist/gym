import { useCallback, useState } from 'react'
import { getWorkoutById } from '../data/workouts'
import { getSessionById, saveSession } from '../utils/storage'
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
  completeSession: () => void
  abandonSession: () => void
  clearSession: () => void
}

export function useWorkoutLog(): UseWorkoutLogReturn {
  const [session, setSession] = useState<WorkoutSession | null>(null)

  const persistSession = useCallback((nextSession: WorkoutSession) => {
    const updatedSession = {
      ...nextSession,
      updatedAt: new Date().toISOString(),
    }
    saveSession(updatedSession)
    setSession(updatedSession)
    return updatedSession
  }, [])

  const startSession = useCallback(
    (workoutType: WorkoutCategory) => {
      const nextSession = createSession(workoutType)
      saveSession(nextSession)
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

  const completeSession = useCallback(() => {
    if (!session) return

    persistSession({
      ...session,
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
  }, [persistSession, session])

  const abandonSession = useCallback(() => {
    if (!session) return

    persistSession({
      ...session,
      status: 'abandoned',
    })
  }, [persistSession, session])

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
    completeSession,
    abandonSession,
    clearSession,
  }
}
