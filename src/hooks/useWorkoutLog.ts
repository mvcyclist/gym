import { useCallback, useState } from 'react'
import { clearDraft, loadDraft, saveDraft } from '../adapters/workoutDraftStorage'
import { getWorkoutById } from '../data/workouts'
import {
  recordCompletedWorkout,
  recordPartialWorkout,
  removeSession,
} from '../services/trainingLedgerService'
import { getWorkoutElapsedMs } from '../utils/workoutTimer'
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
    catalogExerciseId: exercise.catalogExerciseId,
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
    workoutElapsedMs: 0,
    workoutTimerStartedAt: now,
    exercises: createExerciseLogs(workoutType),
  }
}

interface UseWorkoutLogReturn {
  session: WorkoutSession | null
  startSession: (workoutType: WorkoutCategory) => WorkoutSession
  resumeSession: (sessionId: string, options?: { activate?: boolean }) => WorkoutSession | null
  updateSet: (
    exerciseId: string,
    setNumber: number,
    updates: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  prefillExerciseSets: (exerciseId: string, weight: string, reps: string) => void
  completeSet: (exerciseId: string, setNumber: number) => void
  addSet: (exerciseId: string) => void
  deleteSet: (exerciseId: string, setNumber: number) => void
  skipExercise: (exerciseId: string) => WorkoutSession | null
  getExerciseLog: (exerciseId: string) => ExerciseLog | undefined
  isExerciseLogged: (exerciseId: string) => boolean
  finishWorkout: (sessionOverride?: WorkoutSession) => Promise<WorkoutSession | null>
  savePartialWorkout: () => Promise<WorkoutSession | null>
  pauseWorkout: () => WorkoutSession | null
  discardActiveWorkout: () => void
  clearSession: () => void
}

export function useWorkoutLog(): UseWorkoutLogReturn {
  const [session, setSession] = useState<WorkoutSession | null>(null)

  const persistDraft = useCallback((nextSession: WorkoutSession) => {
    const updatedSession = {
      ...nextSession,
      updatedAt: new Date().toISOString(),
    }
    saveDraft(updatedSession)
    setSession(updatedSession)
    return updatedSession
  }, [])

  const startSession = useCallback(
    (workoutType: WorkoutCategory) => {
      const nextSession = createSession(workoutType)
      saveDraft(nextSession)
      setSession(nextSession)
      return nextSession
    },
    [],
  )

  const resumeSession = useCallback(
    (sessionId: string, options?: { activate?: boolean }) => {
      const existing = loadDraft()
      if (!existing || existing.id !== sessionId) return null

      const shouldActivate = options?.activate ?? true
      if (
        !shouldActivate ||
        (existing.status !== 'active' && existing.status !== 'paused')
      ) {
        setSession(existing)
        return existing
      }

      const now = new Date().toISOString()
      const activated: WorkoutSession = {
        ...existing,
        status: 'active',
        workoutElapsedMs: existing.workoutElapsedMs ?? 0,
        workoutTimerStartedAt: now,
      }

      return persistDraft(activated)
    },
    [persistDraft],
  )

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

      persistDraft(nextSession)
    },
    [persistDraft, session],
  )

  const prefillExerciseSets = useCallback(
    (exerciseId: string, weight: string, reps: string) => {
      if (!session) return
      const nextSession: WorkoutSession = {
        ...session,
        exercises: session.exercises.map((exerciseLog) => {
          if (exerciseLog.exerciseId !== exerciseId) return exerciseLog
          return {
            ...exerciseLog,
            sets: exerciseLog.sets.map((setLog) =>
              !setLog.completed && setLog.weight === '' && setLog.reps === ''
                ? { ...setLog, weight, reps }
                : setLog,
            ),
          }
        }),
      }
      persistDraft(nextSession)
    },
    [persistDraft, session],
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

      persistDraft(nextSession)
    },
    [persistDraft, session],
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

      persistDraft(nextSession)
    },
    [persistDraft, session],
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

      persistDraft(nextSession)
    },
    [persistDraft, session],
  )

  const skipExercise = useCallback(
    (exerciseId: string) => {
      if (!session) return null

      const nextSession: WorkoutSession = {
        ...session,
        exercises: session.exercises.filter((log) => log.exerciseId !== exerciseId),
      }

      return persistDraft(nextSession)
    },
    [persistDraft, session],
  )

  const getExerciseLog = useCallback(
    (exerciseId: string) => session?.exercises.find((log) => log.exerciseId === exerciseId),
    [session],
  )

  const isExerciseLogged = useCallback(
    (exerciseId: string) => session?.exercises.some((log) => log.exerciseId === exerciseId) ?? false,
    [session],
  )

  const finishWorkout = useCallback(async (sessionOverride?: WorkoutSession) => {
    const source = sessionOverride ?? session
    if (!source) return null
    const completed: WorkoutSession = {
      ...source,
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workoutElapsedMs: getWorkoutElapsedMs(source),
      workoutTimerStartedAt: null,
    }
    await recordCompletedWorkout(completed)
    clearDraft()
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
      workoutElapsedMs: getWorkoutElapsedMs(session),
      workoutTimerStartedAt: null,
    }
    await recordPartialWorkout(partial)
    clearDraft()
    setSession(partial)
    return partial
  }, [session])

  const pauseWorkout = useCallback(() => {
    if (!session) return null
    if (session.status !== 'active') return session

    const paused: WorkoutSession = {
      ...session,
      status: 'paused',
      workoutElapsedMs: getWorkoutElapsedMs(session),
      workoutTimerStartedAt: null,
    }

    return persistDraft(paused)
  }, [persistDraft, session])

  const discardActiveWorkout = useCallback(() => {
    if (!session) return
    removeSession(session.id)
    clearDraft()
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
    prefillExerciseSets,
    completeSet,
    addSet,
    deleteSet,
    skipExercise,
    getExerciseLog,
    isExerciseLogged,
    finishWorkout,
    savePartialWorkout,
    pauseWorkout,
    discardActiveWorkout,
    clearSession,
  }
}
