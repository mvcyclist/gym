import { getCatalogExerciseById, getDefaultRestSeconds } from '../data/exerciseCatalog'
import { getExerciseByTemplateSlotId, getStaticWorkoutById } from '../data/workouts'
import { resolveExerciseLogCatalogId } from '../services/exerciseIdentity'
import type { Exercise, ExerciseLog, WorkoutSession } from '../types/workout'

function templateFallbackForLog(
  log: ExerciseLog,
  workoutType: WorkoutSession['workoutType'],
): Exercise | undefined {
  const staticWorkout = getStaticWorkoutById(workoutType)
  const bySlot = getExerciseByTemplateSlotId(log.exerciseId)
  if (bySlot) return bySlot

  const catalogId = resolveExerciseLogCatalogId(log)
  if (!catalogId || !staticWorkout) return undefined
  return staticWorkout.exercises.find((item) => item.catalogExerciseId === catalogId)
}

function exerciseFromLog(
  log: ExerciseLog,
  workoutType: WorkoutSession['workoutType'],
): Exercise | null {
  const catalogId = resolveExerciseLogCatalogId(log)
  if (!catalogId) return null

  const template = templateFallbackForLog(log, workoutType)
  const catalog = getCatalogExerciseById(catalogId)

  return {
    id: log.exerciseId,
    catalogExerciseId: catalogId,
    name: log.exerciseName || template?.name || catalog?.name || catalogId,
    primaryMuscles: template?.primaryMuscles ?? ['General'],
    equipment: template?.equipment ?? '—',
    sets: template?.sets ?? '3',
    reps: template?.reps ?? '8–12',
    suggestedRestSeconds: catalog
      ? getDefaultRestSeconds(catalog)
      : template?.suggestedRestSeconds ?? 90,
    instructions: template?.instructions ?? 'Instructions will go here.',
    cues: template?.cues ?? 'Coaching cues will go here.',
    commonMistakes: template?.commonMistakes ?? 'Common mistakes will go here.',
  }
}

/**
 * Build carousel/overview exercises from the session snapshot (catalog + names frozen at log time).
 * Skipped exercises stay in the list so the overview plan remains stable for jump-back navigation.
 */
export function buildDisplayExercisesForSession(session: WorkoutSession): Exercise[] {
  const order =
    session.exerciseOrder ?? session.exercises.map((log) => log.exerciseId)

  return order.flatMap((exerciseId) => {
    const log = session.exercises.find((item) => item.exerciseId === exerciseId)
    if (!log || log.isGuidedSegment) return []
    const exercise = exerciseFromLog(log, session.workoutType)
    return exercise ? [exercise] : []
  })
}

export function sessionExerciseOrder(session: WorkoutSession): string[] {
  const order =
    session.exerciseOrder ?? session.exercises.map((log) => log.exerciseId)
  return order.filter((exerciseId) => {
    const log = session.exercises.find((item) => item.exerciseId === exerciseId)
    return log && !log.isGuidedSegment
  })
}
