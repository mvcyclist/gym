import { useCallback, useRef, useState } from 'react'
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

function createExerciseLogs(workoutType: WorkoutCategory, exerciseOrder?: string[]): ExerciseLog[] {
  const workout = getWorkoutById(workoutType)
  if (!workout) return []

  const templateExercises = exerciseOrder
    ? exerciseOrder.map((id) => workout.exercises.find((e) => e.id === id)).filter(Boolean) as typeof workout.exercises
    : workout.exercises

  return templateExercises.map((exercise) => ({
    exerciseId: exercise.id,
    catalogExerciseId: exercise.catalogExerciseId,
    exerciseName: exercise.name,
    sets: createDefaultSets(),
  }))
}

function createSession(workoutType: WorkoutCategory, exerciseOrder?: string[]): WorkoutSession {
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
    exercises: createExerciseLogs(workoutType, exerciseOrder),
    exerciseOrder,
  }
}

interface UseWorkoutLogReturn {
  session: WorkoutSession | null
  startSession: (workoutType: WorkoutCategory, exerciseOrder?: string[]) => WorkoutSession
  resumeSession: (sessionId: string, options?: { activate?: boolean }) => WorkoutSession | null
  updateSet: (
    exerciseId: string,
    setNumber: number,
    updates: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  prefillExerciseSets: (exerciseId: string, weight: string, reps: string) => void
  completeSet: (
    exerciseId: string,
    setNumber: number,
    updates?: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  addSet: (exerciseId: string) => void
  deleteSet: (exerciseId: string, setNumber: number) => void
  skipExercise: (exerciseId: string) => WorkoutSession | null
  isExerciseSkipped: (exerciseId: string) => boolean
  reorderExercises: (newOrder: string[]) => void
  removeExerciseFromSession: (exerciseId: string) => WorkoutSession | null
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
  const sessionRef = useRef<WorkoutSession | null>(null)

  const commitSession = useCallback((nextSession: WorkoutSession): WorkoutSession => {
    const updatedSession = {
      ...nextSession,
      updatedAt: new Date().toISOString(),
    }
    sessionRef.current = updatedSession
    saveDraft(updatedSession)
    setSession(updatedSession)
    return updatedSession
  }, [])

  const mutateSession = useCallback(
    (mutator: (current: WorkoutSession) => WorkoutSession): WorkoutSession | null => {
      const current = sessionRef.current
      if (!current) return null
      return commitSession(mutator(current))
    },
    [commitSession],
  )

  const startSession = useCallback(
    (workoutType: WorkoutCategory, exerciseOrder?: string[]) => {
      const nextSession = createSession(workoutType, exerciseOrder)
      sessionRef.current = nextSession
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
        sessionRef.current = existing
        setSession(existing)
        return existing
      }

      const now = new Date().toISOString()
      const activated: WorkoutSession = {
        ...existing,
        status: 'active',
        workoutElapsedMs: existing.workoutElapsedMs ?? 0,
        workoutTimerStartedAt: now,
        updatedAt: now,
      }

      sessionRef.current = activated
      saveDraft(activated)
      setSession(activated)
      return activated
    },
    [],
  )

  const updateSet = useCallback(
    (
      exerciseId: string,
      setNumber: number,
      updates: Partial<Pick<SetLog, 'weight' | 'reps'>>,
    ) => {
      mutateSession((current) => ({
        ...current,
        exercises: current.exercises.map((exerciseLog) => {
          if (exerciseLog.exerciseId !== exerciseId) return exerciseLog

          return {
            ...exerciseLog,
            sets: exerciseLog.sets.map((setLog) =>
              setLog.setNumber === setNumber ? { ...setLog, ...updates } : setLog,
            ),
          }
        }),
      }))
    },
    [mutateSession],
  )

  const prefillExerciseSets = useCallback(
    (exerciseId: string, weight: string, reps: string) => {
      mutateSession((current) => ({
        ...current,
        exercises: current.exercises.map((exerciseLog) => {
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
      }))
    },
    [mutateSession],
  )

  const completeSet = useCallback(
    (
      exerciseId: string,
      setNumber: number,
      updates?: Partial<Pick<SetLog, 'weight' | 'reps'>>,
    ) => {
      mutateSession((current) => ({
        ...current,
        exercises: current.exercises.map((exerciseLog) => {
          if (exerciseLog.exerciseId !== exerciseId) return exerciseLog

          return {
            ...exerciseLog,
            sets: exerciseLog.sets.map((setLog) =>
              setLog.setNumber === setNumber
                ? {
                    ...setLog,
                    ...updates,
                    completed: true,
                    completedAt: new Date().toISOString(),
                  }
                : setLog,
            ),
          }
        }),
      }))
    },
    [mutateSession],
  )

  const addSet = useCallback(
    (exerciseId: string) => {
      mutateSession((current) => ({
        ...current,
        exercises: current.exercises.map((exerciseLog) => {
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
      }))
    },
    [mutateSession],
  )

  const deleteSet = useCallback(
    (exerciseId: string, setNumber: number) => {
      mutateSession((current) => ({
        ...current,
        exercises: current.exercises.map((exerciseLog) => {
          if (exerciseLog.exerciseId !== exerciseId) return exerciseLog
          if (exerciseLog.sets.length <= MIN_SET_COUNT) return exerciseLog

          return {
            ...exerciseLog,
            sets: renumberSets(exerciseLog.sets.filter((setLog) => setLog.setNumber !== setNumber)),
          }
        }),
      }))
    },
    [mutateSession],
  )

  const skipExercise = useCallback(
    (exerciseId: string) => {
      return mutateSession((current) => ({
        ...current,
        exercises: current.exercises.map((log) =>
          log.exerciseId === exerciseId
            ? { ...log, skipped: true, sets: createDefaultSets() }
            : log,
        ),
      }))
    },
    [mutateSession],
  )

  const isExerciseSkipped = useCallback(
    (exerciseId: string) =>
      session?.exercises.find((log) => log.exerciseId === exerciseId)?.skipped === true,
    [session],
  )

  const reorderExercises = useCallback(
    (newOrder: string[]) => {
      mutateSession((current) => {
        const reordered = newOrder
          .map((id) => current.exercises.find((log) => log.exerciseId === id))
          .filter(Boolean) as typeof current.exercises

        return {
          ...current,
          exercises: reordered,
          exerciseOrder: newOrder,
        }
      })
    },
    [mutateSession],
  )

  const removeExerciseFromSession = useCallback(
    (exerciseId: string) => {
      return mutateSession((current) => ({
        ...current,
        exercises: current.exercises.filter((log) => log.exerciseId !== exerciseId),
        exerciseOrder: current.exerciseOrder?.filter((id) => id !== exerciseId),
      }))
    },
    [mutateSession],
  )

  const getExerciseLog = useCallback(
    (exerciseId: string) => session?.exercises.find((log) => log.exerciseId === exerciseId),
    [session],
  )

  const isExerciseLogged = useCallback(
    (exerciseId: string) =>
      session?.exercises.some((log) => log.exerciseId === exerciseId && !log.skipped) ?? false,
    [session],
  )

  const finishWorkout = useCallback(async (sessionOverride?: WorkoutSession) => {
    const source = sessionOverride ?? sessionRef.current
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
    sessionRef.current = completed
    setSession(completed)
    return completed
  }, [])

  const savePartialWorkout = useCallback(async () => {
    const source = sessionRef.current
    if (!source) return null
    const partial: WorkoutSession = {
      ...source,
      status: 'partial',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workoutElapsedMs: getWorkoutElapsedMs(source),
      workoutTimerStartedAt: null,
    }
    await recordPartialWorkout(partial)
    clearDraft()
    sessionRef.current = partial
    setSession(partial)
    return partial
  }, [])

  const pauseWorkout = useCallback(() => {
    const source = sessionRef.current
    if (!source) return null
    if (source.status !== 'active') return source

    const paused: WorkoutSession = {
      ...source,
      status: 'paused',
      workoutElapsedMs: getWorkoutElapsedMs(source),
      workoutTimerStartedAt: null,
      updatedAt: new Date().toISOString(),
    }

    sessionRef.current = paused
    saveDraft(paused)
    setSession(paused)
    return paused
  }, [])

  const discardActiveWorkout = useCallback(() => {
    const source = sessionRef.current
    if (!source) return
    removeSession(source.id)
    clearDraft()
    sessionRef.current = null
    setSession(null)
  }, [])

  const clearSession = useCallback(() => {
    sessionRef.current = null
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
    isExerciseSkipped,
    reorderExercises,
    removeExerciseFromSession,
    getExerciseLog,
    isExerciseLogged,
    finishWorkout,
    savePartialWorkout,
    pauseWorkout,
    discardActiveWorkout,
    clearSession,
  }
}
