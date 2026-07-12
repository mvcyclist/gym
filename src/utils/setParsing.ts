import type { SetLog } from '../types/workout'
import { getCatalogExerciseById } from '../data/exerciseCatalog'

export type ParsedWeight = number | 'BW'

export interface ParsedSetLoad {
  weight: ParsedWeight | null
  reps: number | null
}

export function parseWeight(value: string): ParsedWeight | null {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '0') return null

  const upper = trimmed.toUpperCase()
  if (upper === 'B' || upper === 'BW') return 'BW'

  const numeric = Number(trimmed)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return numeric
}

export function parseReps(value: string): number | null {
  const digits = value.replace(/\D/g, '')
  if (digits === '') return null
  const reps = Number(digits)
  if (!Number.isFinite(reps) || reps <= 0) return null
  return reps
}

export function parseSetLoad(set: SetLog, catalogExerciseId?: string): ParsedSetLoad {
  const reps = parseReps(set.reps)
  if (catalogExerciseId) {
    const catalog = getCatalogExerciseById(catalogExerciseId)
    if (catalog?.coachingMode === 'time') {
      return { weight: reps !== null ? 'BW' : null, reps }
    }
  }
  return {
    weight: parseWeight(set.weight),
    reps,
  }
}

export function isSetLogComplete(set: SetLog): boolean {
  if (!set.completed) return false
  const { weight, reps } = parseSetLoad(set)
  return weight !== null && reps !== null
}

export interface TopSet {
  weight: ParsedWeight
  reps: number
}

/** Highest volume set; ties broken by higher weight then higher reps. */
export function findTopSet(sets: Array<{ weight: ParsedWeight; reps: number }>): TopSet | null {
  if (sets.length === 0) return null

  return sets.reduce((best, current) => {
    const bestVolume = topSetVolume(best)
    const currentVolume = topSetVolume(current)
    if (currentVolume > bestVolume) return current
    if (currentVolume < bestVolume) return best
    if (current.weight === 'BW' && best.weight !== 'BW') return best
    if (best.weight === 'BW' && current.weight !== 'BW') return current
    if (typeof current.weight === 'number' && typeof best.weight === 'number') {
      if (current.weight !== best.weight) {
        return current.weight > best.weight ? current : best
      }
    }
    return current.reps >= best.reps ? current : best
  })
}

function topSetVolume(set: TopSet): number {
  if (set.weight === 'BW') return set.reps
  return set.weight * set.reps
}

/** Sum weight × reps for numeric loads only; null if any completed set uses BW. */
export function computeTotalVolume(
  sets: Array<{ weight: ParsedWeight; reps: number }>,
): number | null {
  if (sets.length === 0) return null
  if (sets.some((set) => set.weight === 'BW')) return null

  return sets.reduce((total, set) => {
    if (typeof set.weight !== 'number') return total
    return total + set.weight * set.reps
  }, 0)
}

export function sumReps(sets: Array<{ reps: number }>): number {
  return sets.reduce((total, set) => total + set.reps, 0)
}
