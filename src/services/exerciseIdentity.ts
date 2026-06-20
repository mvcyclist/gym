/**
 * Exercise identity — Option A (catalog).
 *
 * historyExerciseKey is a catalogExerciseId (e.g. barbell_bench_press).
 * Session logs store catalogExerciseId on ExerciseLog at write time.
 * Legacy rows without catalogExerciseId fall back to template slot → catalog map.
 */
import { getCatalogExerciseById, isCatalogExerciseId } from '../data/exerciseCatalog'
import { workouts } from '../data/workouts'
import type { ExerciseLog } from '../types/workout'

export type HistoryKeyKind = 'catalog'

export const HISTORY_KEY_KIND: HistoryKeyKind = 'catalog'

let slotToCatalogId: Map<string, string> | null = null

function getSlotToCatalogMap(): Map<string, string> {
  if (slotToCatalogId) return slotToCatalogId

  slotToCatalogId = new Map()
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      slotToCatalogId.set(exercise.id, exercise.catalogExerciseId)
    }
  }
  return slotToCatalogId
}

export function getCatalogIdForTemplateSlot(slotId: string): string | undefined {
  return getSlotToCatalogMap().get(slotId)
}

/** Resolve catalog id from a persisted exercise log (handles legacy sessions). */
export function resolveExerciseLogCatalogId(log: ExerciseLog): string | null {
  if (log.catalogExerciseId) return log.catalogExerciseId

  const fromSlot = getCatalogIdForTemplateSlot(log.exerciseId)
  if (fromSlot) return fromSlot

  return null
}

export function exerciseLogMatchesHistoryKey(
  log: ExerciseLog,
  historyExerciseKey: string,
): boolean {
  const catalogId = resolveExerciseLogCatalogId(log)
  return catalogId !== null && catalogId === historyExerciseKey
}

export function resolveHistoryExerciseName(
  historyExerciseKey: string,
  fallbackLog?: ExerciseLog,
): string {
  const fromCatalog = getCatalogExerciseById(historyExerciseKey)?.name
  if (fromCatalog) return fromCatalog
  if (fallbackLog?.exerciseName) return fallbackLog.exerciseName
  return historyExerciseKey
}

export function assertValidHistoryExerciseKey(historyExerciseKey: string): void {
  if (!isCatalogExerciseId(historyExerciseKey)) {
    throw new Error(`[exerciseIdentity] unknown catalog id: ${historyExerciseKey}`)
  }
}
