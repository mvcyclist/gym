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

// ─── Default profiles ─────────────────────────────────────────────────────────

export const DEFAULT_PROFILES: Record<string, ExerciseProfile> = {
  'bench press':            { name: 'Bench press',            category: 'hypertrophy_compound',  repRangeBottom: 6,  repRangeTop: 10, targetSets: 3, weightIncrement: 5,   isBodyweight: false, seedWeight: 135 },
  'squat':                  { name: 'Squat',                  category: 'strength_compound',     repRangeBottom: 4,  repRangeTop: 6,  targetSets: 4, weightIncrement: 5,   isBodyweight: false, seedWeight: 135 },
  'deadlift':               { name: 'Deadlift',               category: 'strength_compound',     repRangeBottom: 4,  repRangeTop: 6,  targetSets: 3, weightIncrement: 5,   isBodyweight: false, seedWeight: 135 },
  'overhead press':         { name: 'Overhead press',         category: 'hypertrophy_compound',  repRangeBottom: 6,  repRangeTop: 10, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 75  },
  'barbell row':            { name: 'Barbell row',            category: 'hypertrophy_compound',  repRangeBottom: 6,  repRangeTop: 10, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 95  },
  'romanian deadlift':      { name: 'Romanian deadlift',      category: 'hypertrophy_compound',  repRangeBottom: 8,  repRangeTop: 12, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 95  },
  'incline bench press':    { name: 'Incline bench press',    category: 'hypertrophy_compound',  repRangeBottom: 6,  repRangeTop: 10, targetSets: 3, weightIncrement: 5,   isBodyweight: false, seedWeight: 115 },
  'dumbbell curl':          { name: 'Dumbbell curl',          category: 'hypertrophy_isolation', repRangeBottom: 10, repRangeTop: 15, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 25  },
  'tricep pushdown':        { name: 'Tricep pushdown',        category: 'hypertrophy_isolation', repRangeBottom: 10, repRangeTop: 15, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 40  },
  'lat pulldown':           { name: 'Lat pulldown',           category: 'hypertrophy_compound',  repRangeBottom: 8,  repRangeTop: 12, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 80  },
  'cable row':              { name: 'Cable row',              category: 'hypertrophy_compound',  repRangeBottom: 8,  repRangeTop: 12, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 70  },
  'leg press':              { name: 'Leg press',              category: 'hypertrophy_compound',  repRangeBottom: 8,  repRangeTop: 12, targetSets: 3, weightIncrement: 5,   isBodyweight: false, seedWeight: 180 },
  'leg curl':               { name: 'Leg curl',               category: 'hypertrophy_isolation', repRangeBottom: 10, repRangeTop: 15, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 60  },
  'lateral raise':          { name: 'Lateral raise',          category: 'hypertrophy_isolation', repRangeBottom: 12, repRangeTop: 15, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 15  },
  'dumbbell pullover':      { name: 'Dumbbell pullover',      category: 'hypertrophy_isolation', repRangeBottom: 10, repRangeTop: 15, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 30  },
  'pushup':                 { name: 'Pushup',                 category: 'bodyweight',            repRangeBottom: 8,  repRangeTop: 15, targetSets: 3, weightIncrement: 0,   isBodyweight: true,  seedWeight: 0   },
  'pullup':                 { name: 'Pullup',                 category: 'bodyweight',            repRangeBottom: 5,  repRangeTop: 10, targetSets: 3, weightIncrement: 0,   isBodyweight: true,  seedWeight: 0   },
  'dip':                    { name: 'Dip',                    category: 'bodyweight',            repRangeBottom: 8,  repRangeTop: 15, targetSets: 3, weightIncrement: 0,   isBodyweight: true,  seedWeight: 0   },
  'atomic push-up':         { name: 'Atomic push-up',         category: 'bodyweight',            repRangeBottom: 8,  repRangeTop: 12, targetSets: 3, weightIncrement: 0,   isBodyweight: true,  seedWeight: 0   },
  'trx tricep extension':   { name: 'TRX tricep extension',   category: 'bodyweight',            repRangeBottom: 10, repRangeTop: 15, targetSets: 3, weightIncrement: 0,   isBodyweight: true,  seedWeight: 0   },
  'trx pike':               { name: 'TRX pike',               category: 'bodyweight',            repRangeBottom: 8,  repRangeTop: 12, targetSets: 3, weightIncrement: 0,   isBodyweight: true,  seedWeight: 0   },
  'close-grip push-up':     { name: 'Close-grip push-up',     category: 'bodyweight',            repRangeBottom: 8,  repRangeTop: 15, targetSets: 3, weightIncrement: 0,   isBodyweight: true,  seedWeight: 0   },
  'overhead db tricep extension': { name: 'Overhead DB tricep extension', category: 'hypertrophy_isolation', repRangeBottom: 10, repRangeTop: 15, targetSets: 3, weightIncrement: 2.5, isBodyweight: false, seedWeight: 25 },
}

export function getDefaultProfile(exerciseName: string): ExerciseProfile {
  const key = normalizeExerciseName(exerciseName)
  return DEFAULT_PROFILES[key] ?? {
    name: exerciseName,
    category: 'hypertrophy_compound',
    repRangeBottom: 6,
    repRangeTop: 10,
    targetSets: 3,
    weightIncrement: 2.5,
    isBodyweight: false,
    seedWeight: 0,
  }
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

export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}
