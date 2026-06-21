// progressiveOverloadEngine.ts — BusyDad Progressive Overload Engine v2
//
// Changes from v1:
//   - PROGRESS requires qualifying set count (ceil(targetSets/2) sets hitting repRangeBottom)
//     in addition to best set hitting repRangeTop. Scientifically more rigorous.
//   - Stall detection uses qualifying sets, not best reps.
//   - Double increment for unusually strong sessions (best reps >= top + 3).
//   - qualifyingSets added to ExerciseHistory for accurate stall tracking.
//   - Desktop layout notes in PROGRESSIVE_OVERLOAD_SPEC.md.
//
// Pure function: (history, profile) => ProgressionTarget
// No side effects. No storage reads/writes.

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgressionState = 'PROGRESS' | 'ACCUMULATE' | 'CONSOLIDATE' | 'DELOAD' | 'FIRST'

export type ExerciseCategory =
  | 'strength_compound'
  | 'hypertrophy_compound'
  | 'hypertrophy_isolation'
  | 'bodyweight'

export interface ExerciseSet {
  reps: number
  weightLbs: number
  completed: boolean
}

export interface ExerciseHistory {
  exerciseName: string
  date: string
  timestamp: number
  weight: number
  sets: ExerciseSet[]
  repRangeBottom: number
  repRangeTop: number
  qualifyingSets: number     // sets that hit repRangeBottom that session
}

export interface ExerciseProfile {
  name: string
  category: ExerciseCategory
  repRangeBottom: number
  repRangeTop: number
  targetSets: number
  weightIncrement: number
  isBodyweight: boolean
  seedWeight: number
}

export interface ProgressionTarget {
  exerciseName: string
  state: ProgressionState
  targetWeight: number
  targetRepsBottom: number
  targetRepsTop: number
  targetSets: number
  lastWeight: number | null
  lastBestReps: number | null
  lastQualifyingSets: number | null
  stallCount: number
  label: string
  sublabel: string
}

// ─── Catalog profiles (keyed by historyExerciseKey / catalogExerciseId) ───────

type CatalogProfile = Omit<ExerciseProfile, 'name'>

const compoundUpper = (overrides: Partial<CatalogProfile> = {}): CatalogProfile => ({
  category: 'hypertrophy_compound',
  repRangeBottom: 6,
  repRangeTop: 10,
  targetSets: 3,
  weightIncrement: 5,
  isBodyweight: false,
  seedWeight: 0,
  ...overrides,
})

const compoundLower = (overrides: Partial<CatalogProfile> = {}): CatalogProfile => ({
  category: 'strength_compound',
  repRangeBottom: 8,
  repRangeTop: 10,
  targetSets: 4,
  weightIncrement: 10,
  isBodyweight: false,
  seedWeight: 0,
  ...overrides,
})

const isolationUpper = (overrides: Partial<CatalogProfile> = {}): CatalogProfile => ({
  category: 'hypertrophy_isolation',
  repRangeBottom: 10,
  repRangeTop: 15,
  targetSets: 3,
  weightIncrement: 2.5,
  isBodyweight: false,
  seedWeight: 0,
  ...overrides,
})

const isolationLower = (overrides: Partial<CatalogProfile> = {}): CatalogProfile => ({
  category: 'hypertrophy_isolation',
  repRangeBottom: 10,
  repRangeTop: 15,
  targetSets: 3,
  weightIncrement: 5,
  isBodyweight: false,
  seedWeight: 0,
  ...overrides,
})

const bodyweight = (overrides: Partial<CatalogProfile> = {}): CatalogProfile => ({
  category: 'bodyweight',
  repRangeBottom: 8,
  repRangeTop: 12,
  targetSets: 3,
  weightIncrement: 0,
  isBodyweight: true,
  seedWeight: 0,
  ...overrides,
})

export const CATALOG_PROFILES: Record<string, CatalogProfile> = {
  barbell_bench_press: compoundUpper({ seedWeight: 135 }),
  dumbbell_pullover: isolationUpper({ repRangeBottom: 10, repRangeTop: 12, seedWeight: 30 }),
  overhead_press: compoundUpper({ weightIncrement: 2.5, seedWeight: 75 }),
  inclined_barbell_press: compoundUpper({ repRangeBottom: 8, repRangeTop: 12, seedWeight: 115 }),
  lateral_raises: isolationUpper({ repRangeBottom: 12, repRangeTop: 15, seedWeight: 15 }),
  atomic_push_up: bodyweight(),
  overhead_db_tricep_extension: isolationUpper({ seedWeight: 25 }),
  trx_tricep_extension: bodyweight({ repRangeBottom: 10, repRangeTop: 15 }),
  close_grip_push_ups: bodyweight({ repRangeBottom: 10, repRangeTop: 15 }),
  trx_pike: bodyweight(),
  pull_ups: bodyweight({ repRangeBottom: 5, repRangeTop: 10 }),
  barbell_rows: compoundUpper({ repRangeBottom: 8, repRangeTop: 12, weightIncrement: 2.5, seedWeight: 95 }),
  single_dumbbell_arm_rows: compoundUpper({ repRangeBottom: 8, repRangeTop: 12, weightIncrement: 2.5, seedWeight: 50 }),
  trx_rear_delt_fly: isolationUpper({ repRangeBottom: 12, repRangeTop: 15 }),
  barbell_curls: isolationUpper({ repRangeBottom: 8, repRangeTop: 12, seedWeight: 45 }),
  barbell_reverse_curls: isolationUpper({ repRangeBottom: 10, repRangeTop: 12, seedWeight: 45 }),
  trx_core_1: bodyweight(),
  trx_core_2: bodyweight(),
  trx_core_3: bodyweight(),
  barbell_back_squat: compoundLower({ seedWeight: 135 }),
  barbell_hip_thrust: compoundLower({ targetSets: 3, weightIncrement: 5, seedWeight: 135 }),
  trx_weighted_lunge: compoundLower({ targetSets: 3, repRangeBottom: 10, repRangeTop: 10, weightIncrement: 5, seedWeight: 25 }),
  trx_hamstring_curl: isolationLower({ targetSets: 2, repRangeBottom: 10, repRangeTop: 12, seedWeight: 0 }),
  standing_calf_raise: isolationLower({ seedWeight: 25 }),
  trx_side_tuck: bodyweight({ repRangeBottom: 10, repRangeTop: 10 }),
  plank: bodyweight(),
  side_plank: bodyweight({ repRangeBottom: 8, repRangeTop: 12 }),
  dead_bug: bodyweight({ repRangeBottom: 8, repRangeTop: 12 }),
  hollow_hold: bodyweight(),
  mountain_climber: bodyweight(),
  pallof_press: bodyweight({ repRangeBottom: 10, repRangeTop: 12 }),
}

function fallbackCatalogProfile(_displayName: string): CatalogProfile {
  return compoundUpper({ seedWeight: 0 })
}

export function parseWorkoutTemplateReps(
  reps: string,
): { bottom: number; top: number } | null {
  const range = reps.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (range) return { bottom: Number(range[1]), top: Number(range[2]) }
  const single = reps.match(/^(\d+)/)
  if (single) {
    const value = Number(single[1])
    return { bottom: value, top: value }
  }
  return null
}

export function parseWorkoutTemplateSets(sets: string): number | null {
  const value = parseInt(sets, 10)
  return Number.isNaN(value) ? null : value
}

export function getProfileForCatalogId(
  catalogExerciseId: string,
  displayName: string,
  template?: { sets?: string; reps?: string },
): ExerciseProfile {
  const base = CATALOG_PROFILES[catalogExerciseId] ?? fallbackCatalogProfile(displayName)
  const profile: ExerciseProfile = { ...base, name: displayName }

  if (template?.reps) {
    const range = parseWorkoutTemplateReps(template.reps)
    if (range) {
      profile.repRangeBottom = range.bottom
      profile.repRangeTop = range.top
    }
  }

  if (template?.sets) {
    const sets = parseWorkoutTemplateSets(template.sets)
    if (sets !== null) profile.targetSets = sets
  }

  return profile
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export function getProgressionTarget(
  history: ExerciseHistory[],
  profile: ExerciseProfile
): ProgressionTarget {
  const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp)

  if (sorted.length === 0) return firstSession(profile)

  const last = sorted[0]
  const lastBestReps = bestReps(last.sets)
  const lastWeight = last.weight
  const stalls = detectStall(sorted, profile)
  const qualifyingThreshold = Math.ceil(profile.targetSets / 2)
  const lastQualifying = last.qualifyingSets

  if (profile.isBodyweight) {
    return bodyweightProgression(last, lastBestReps, lastQualifying, profile, stalls)
  }

  // Stall → deload
  if (stalls >= 2) return deload(lastWeight, lastBestReps, lastQualifying, profile, stalls)

  // Progress: best set hit top AND enough qualifying sets
  if (lastBestReps >= profile.repRangeTop && lastQualifying >= qualifyingThreshold) {
    return progress(lastWeight, lastBestReps, lastQualifying, profile)
  }

  // Accumulate: best set in range but not enough to progress
  if (lastBestReps >= profile.repRangeBottom) {
    return accumulate(lastWeight, lastBestReps, lastQualifying, profile)
  }

  // Consolidate: below rep floor
  return consolidate(lastWeight, lastBestReps, lastQualifying, profile)
}

// ─── State builders ───────────────────────────────────────────────────────────

function firstSession(profile: ExerciseProfile): ProgressionTarget {
  const weightStr = profile.seedWeight > 0 ? `${profile.seedWeight} lbs × ` : ''
  return {
    exerciseName: profile.name,
    state: 'FIRST',
    targetWeight: profile.seedWeight,
    targetRepsBottom: profile.repRangeBottom,
    targetRepsTop: profile.repRangeTop,
    targetSets: profile.targetSets,
    lastWeight: null,
    lastBestReps: null,
    lastQualifyingSets: null,
    stallCount: 0,
    label: `No history  →  Target: ${weightStr}${profile.repRangeBottom}–${profile.repRangeTop}`,
    sublabel: 'First session — log what feels right',
  }
}

function progress(
  lastWeight: number,
  lastBestReps: number,
  lastQualifying: number,
  profile: ExerciseProfile
): ProgressionTarget {
  // Double increment for unusually strong sessions
  const increment = lastBestReps >= profile.repRangeTop + 3
    ? profile.weightIncrement * 2
    : profile.weightIncrement
  const targetWeight = lastWeight + increment

  return {
    exerciseName: profile.name,
    state: 'PROGRESS',
    targetWeight,
    targetRepsBottom: profile.repRangeBottom,
    targetRepsTop: profile.repRangeTop,
    targetSets: profile.targetSets,
    lastWeight,
    lastBestReps,
    lastQualifyingSets: lastQualifying,
    stallCount: 0,
    label: `Last: ${lastWeight} lbs × ${lastBestReps}  →  Target: ${targetWeight} lbs × ${profile.repRangeBottom}–${profile.repRangeTop}`,
    sublabel: '↑ Ready to progress — add weight today',
  }
}

function accumulate(
  lastWeight: number,
  lastBestReps: number,
  lastQualifying: number,
  profile: ExerciseProfile
): ProgressionTarget {
  const targetRepsBottom = Math.min(lastBestReps + 1, profile.repRangeTop)

  return {
    exerciseName: profile.name,
    state: 'ACCUMULATE',
    targetWeight: lastWeight,
    targetRepsBottom,
    targetRepsTop: profile.repRangeTop,
    targetSets: profile.targetSets,
    lastWeight,
    lastBestReps,
    lastQualifyingSets: lastQualifying,
    stallCount: 0,
    label: `Last: ${lastWeight} lbs × ${lastBestReps}  →  Target: ${lastWeight} lbs × ${targetRepsBottom}+`,
    sublabel: '→ Build reps before moving up',
  }
}

function consolidate(
  lastWeight: number,
  lastBestReps: number,
  lastQualifying: number,
  profile: ExerciseProfile
): ProgressionTarget {
  return {
    exerciseName: profile.name,
    state: 'CONSOLIDATE',
    targetWeight: lastWeight,
    targetRepsBottom: profile.repRangeBottom,
    targetRepsTop: profile.repRangeTop,
    targetSets: profile.targetSets,
    lastWeight,
    lastBestReps,
    lastQualifyingSets: lastQualifying,
    stallCount: 0,
    label: `Last: ${lastWeight} lbs × ${lastBestReps}  →  Target: ${lastWeight} lbs × ${profile.repRangeBottom}–${profile.repRangeTop}`,
    sublabel: '= Hit the range consistently first',
  }
}

function deload(
  lastWeight: number,
  lastBestReps: number,
  lastQualifying: number,
  profile: ExerciseProfile,
  stallCount: number
): ProgressionTarget {
  const raw = lastWeight * 0.9
  const targetWeight = Math.floor(raw / profile.weightIncrement) * profile.weightIncrement

  return {
    exerciseName: profile.name,
    state: 'DELOAD',
    targetWeight,
    targetRepsBottom: profile.repRangeBottom,
    targetRepsTop: profile.repRangeTop,
    targetSets: profile.targetSets,
    lastWeight,
    lastBestReps,
    lastQualifyingSets: lastQualifying,
    stallCount,
    label: `Last: ${lastWeight} lbs × ${lastBestReps}  →  Target: ${targetWeight} lbs × ${profile.repRangeBottom}–${profile.repRangeTop}`,
    sublabel: `↓ Stalled ${stallCount} sessions — reset and rebuild`,
  }
}

function bodyweightProgression(
  _last: ExerciseHistory,
  lastBestReps: number,
  lastQualifying: number,
  profile: ExerciseProfile,
  stallCount: number
): ProgressionTarget {
  const qualifyingThreshold = Math.ceil(profile.targetSets / 2)

  if (stallCount >= 2) {
    return {
      exerciseName: profile.name,
      state: 'CONSOLIDATE',
      targetWeight: 0,
      targetRepsBottom: profile.repRangeBottom,
      targetRepsTop: profile.repRangeTop,
      targetSets: profile.targetSets,
      lastWeight: 0,
      lastBestReps,
      lastQualifyingSets: lastQualifying,
      stallCount,
      label: `Last: BW × ${lastBestReps}  →  Target: BW × ${profile.repRangeBottom}–${profile.repRangeTop}`,
      sublabel: '= Focus on consistent reps before adding load',
    }
  }

  if (lastBestReps >= profile.repRangeTop && lastQualifying >= qualifyingThreshold) {
    const suggestLoad = lastBestReps >= profile.repRangeTop + 5
    const targetReps = lastBestReps + 2

    return {
      exerciseName: profile.name,
      state: suggestLoad ? 'PROGRESS' : 'ACCUMULATE',
      targetWeight: 0,
      targetRepsBottom: suggestLoad ? profile.repRangeBottom : targetReps,
      targetRepsTop: suggestLoad ? profile.repRangeTop : targetReps + 2,
      targetSets: profile.targetSets,
      lastWeight: 0,
      lastBestReps,
      lastQualifyingSets: lastQualifying,
      stallCount: 0,
      label: `Last: BW × ${lastBestReps}  →  Target: BW × ${suggestLoad ? profile.repRangeBottom + '+' : targetReps}`,
      sublabel: suggestLoad
        ? '↑ Consider adding load (vest or band) — reps are high'
        : '→ Keep building reps',
    }
  }

  return {
    exerciseName: profile.name,
    state: 'ACCUMULATE',
    targetWeight: 0,
    targetRepsBottom: lastBestReps + 1,
    targetRepsTop: profile.repRangeTop,
    targetSets: profile.targetSets,
    lastWeight: 0,
    lastBestReps,
    lastQualifyingSets: lastQualifying,
    stallCount: 0,
    label: `Last: BW × ${lastBestReps}  →  Target: BW × ${lastBestReps + 1}+`,
    sublabel: '→ Build reps before adding load',
  }
}

// ─── Stall detection (v2 — uses qualifyingSets) ───────────────────────────────

function detectStall(history: ExerciseHistory[], profile: ExerciseProfile): number {
  if (history.length < 2) return 0

  const currentWeight = history[0].weight
  const qualifyingThreshold = Math.ceil(profile.targetSets / 2)
  let stallCount = 0

  for (const session of history.slice(1)) {
    if (session.weight !== currentWeight) break
    if (session.qualifyingSets < qualifyingThreshold) stallCount++
    else break
  }

  return stallCount
}

// ─── PR detection (call after each set completion) ────────────────────────────

export function checkPR(
  allHistory: ExerciseHistory[],
  loggedWeight: number,
  loggedReps: number
): boolean {
  if (allHistory.length === 0) return false

  // Epley 1RM formula: weight × (1 + reps/30)
  const current1RM = loggedWeight * (1 + loggedReps / 30)
  const previousBest1RM = Math.max(
    ...allHistory.flatMap(h =>
      h.sets
        .filter(s => s.completed)
        .map(s => s.weightLbs * (1 + s.reps / 30))
    )
  )

  return current1RM > previousBest1RM
}

// ─── Qualifying sets helper (call after session to write to history) ──────────

export function countQualifyingSets(
  sets: ExerciseSet[],
  repRangeBottom: number
): number {
  return sets.filter(s => s.completed && s.reps >= repRangeBottom).length
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function bestReps(sets: ExerciseSet[]): number {
  const completed = sets.filter(s => s.completed)
  if (completed.length === 0) return 0
  return Math.max(...completed.map(s => s.reps))
}

