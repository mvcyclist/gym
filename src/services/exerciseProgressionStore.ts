import type { ExerciseHistory, ExerciseProfile } from './progressiveOverloadEngine'
import {
  normalizeExerciseName,
  getDefaultProfile,
  countQualifyingSets,
} from './progressiveOverloadEngine'
import { loadLedger } from './ledgerRepository'

const HISTORY_KEY = 'exerciseHistory'
const PROFILES_KEY = 'exerciseProfiles'
const MIGRATION_KEY = 'exerciseHistoryMigrated_v1'

// One-time migration: seed exerciseHistory from existing ledger sessions
function migrateFromLedger(): void {
  if (localStorage.getItem(MIGRATION_KEY)) return

  try {
    const ledger = loadLedger()
    const completed = ledger.sessions.filter(
      (s) => s.status === 'completed' || s.status === 'partial',
    )

    // Sort oldest first so history is in chronological order
    completed.sort((a, b) => {
      const at = a.completedAt ?? a.updatedAt
      const bt = b.completedAt ?? b.updatedAt
      return at.localeCompare(bt)
    })

    const entries: ExerciseHistory[] = []

    for (const session of completed) {
      const date = (session.completedAt ?? session.updatedAt).slice(0, 10)
      const timestamp = new Date(session.completedAt ?? session.updatedAt).getTime()

      for (const log of session.exercises) {
        const completedSets = log.sets.filter((s) => s.completed)
        if (completedSets.length === 0) continue

        const engineSets = completedSets
          .map((s) => {
            const w = parseFloat(s.weight)
            const r = parseInt(s.reps, 10)
            if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return null
            return { reps: r, weightLbs: w, completed: true as const }
          })
          .filter((s): s is { reps: number; weightLbs: number; completed: true } => s !== null)

        if (engineSets.length === 0) continue

        const profile = getDefaultProfile(log.exerciseName)
        const topWeight = Math.max(...engineSets.map((s) => s.weightLbs))

        entries.push({
          exerciseName: normalizeExerciseName(log.exerciseName),
          date,
          timestamp,
          weight: topWeight,
          sets: engineSets,
          repRangeBottom: profile.repRangeBottom,
          repRangeTop: profile.repRangeTop,
          qualifyingSets: countQualifyingSets(engineSets, profile.repRangeBottom),
        })
      }
    }

    if (entries.length > 0) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
    }
  } catch {
    // Migration failed — don't retry, just start fresh
  }

  localStorage.setItem(MIGRATION_KEY, '1')
}

export function loadExerciseHistory(exerciseName: string): ExerciseHistory[] {
  migrateFromLedger()
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
