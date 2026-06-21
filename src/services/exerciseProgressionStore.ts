import type { ExerciseHistory, ExerciseProfile } from './progressiveOverloadEngine'
import { normalizeExerciseName } from './progressiveOverloadEngine'

const HISTORY_KEY = 'exerciseHistory'
const PROFILES_KEY = 'exerciseProfiles'

export function loadExerciseHistory(exerciseName: string): ExerciseHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const all: ExerciseHistory[] = JSON.parse(raw)
    const key = normalizeExerciseName(exerciseName)
    return all.filter((h) => h.exerciseName === key)
  } catch {
    return []
  }
}

export function appendExerciseHistory(entry: ExerciseHistory): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const all: ExerciseHistory[] = raw ? JSON.parse(raw) : []
    all.push(entry)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all))
  } catch {
    // storage full or unavailable — silently skip
  }
}

export function loadExerciseProfile(exerciseName: string): ExerciseProfile | null {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (!raw) return null
    const profiles: Record<string, ExerciseProfile> = JSON.parse(raw)
    return profiles[normalizeExerciseName(exerciseName)] ?? null
  } catch {
    return null
  }
}
