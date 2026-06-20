// recommendationEngine.ts — BusyDad Workout Recommendation Engine
//
// Pure function: (history: DayActivity[], palette?: UserPalette, now?: Date) => RecommendationResult | null
// Adapts the existing DayActivity[] shape internally — no changes to stored data models.

import type { DayActivity } from '../types/training'
import {
  LOAD_PROFILES,
  DEFAULT_PALETTE,
  type WorkoutType,
  type QualityBucket,
  type RecommendationResult,
  type ScoredWorkout,
  type AddonSuggestion,
  type UserPalette,
} from '../types/training'

// ─── Internal flat entry (engine-only, not stored) ───────────────────────────

interface EngineEntry {
  type: WorkoutType
  timestamp: number
  date: string
}

// ─── Adapt existing DayActivity[] → EngineEntry[] ────────────────────────────

const VALID_ENGINE_TYPES = new Set<string>(Object.keys(LOAD_PROFILES))

function adaptHistory(history: DayActivity[]): EngineEntry[] {
  const entries: EngineEntry[] = []
  for (const day of history) {
    for (const activity of day.activities) {
      if (!VALID_ENGINE_TYPES.has(activity.type)) continue
      entries.push({
        type: activity.type as WorkoutType,
        date: day.date,
        timestamp: new Date(day.date + 'T12:00:00').getTime(),
      })
    }
  }
  return entries
}

// ─── Scoring context ─────────────────────────────────────────────────────────

interface ScoringContext {
  now: Date
  last7Days: EngineEntry[]
  lastSessionByType: Map<WorkoutType, EngineEntry>
  hardSessionCount: number
  legFatiguePool: number
  daysSinceLastRestLike: number
  palette: WorkoutType[]
}

function buildScoringContext(
  last7Days: EngineEntry[],
  palette: UserPalette,
  now: Date,
): ScoringContext {
  const lastSessionByType = new Map<WorkoutType, EngineEntry>()
  for (const entry of [...last7Days].sort((a, b) => b.timestamp - a.timestamp)) {
    if (!lastSessionByType.has(entry.type)) lastSessionByType.set(entry.type, entry)
  }

  const hardSessionCount = last7Days.filter((e) => LOAD_PROFILES[e.type].isHardSession).length

  const legFatiguePool = computeLegFatiguePool(last7Days, now)

  const restLikeTypes: WorkoutType[] = ['Rest', 'Walk', 'Mobility']
  const lastRestLike = [...last7Days]
    .filter((e) => restLikeTypes.includes(e.type))
    .sort((a, b) => b.timestamp - a.timestamp)[0]
  const daysSinceLastRestLike = lastRestLike
    ? hoursBetween(new Date(lastRestLike.timestamp), now) / 24
    : 999

  return { now, last7Days, lastSessionByType, hardSessionCount, legFatiguePool, daysSinceLastRestLike, palette: palette.types }
}

// ─── Leg fatigue pool ─────────────────────────────────────────────────────────

function computeLegFatiguePool(sessions: EngineEntry[], now: Date): number {
  let pool = 0
  for (const session of sessions) {
    const contribution = LOAD_PROFILES[session.type].legPoolContribution
    if (contribution === 0) continue
    const hoursAgo = hoursBetween(new Date(session.timestamp), now)
    const decayFactor = Math.max(0, 1 - hoursAgo / 24)
    pool += contribution * decayFactor
  }
  return pool
}

// ─── Per-type scorer ──────────────────────────────────────────────────────────

function scoreWorkoutType(type: WorkoutType, ctx: ScoringContext): ScoredWorkout {
  const profile = LOAD_PROFILES[type]
  let score = 0

  // Step 1 — Base score (recovery)
  if (profile.isLowLoad) {
    score = 4
  } else {
    const lastSession = ctx.lastSessionByType.get(type)
    if (!lastSession) {
      score = 4
    } else {
      const hoursAgo = hoursBetween(new Date(lastSession.timestamp), ctx.now)
      score = Math.min(1, hoursAgo / profile.recoveryHours) * 4
    }
  }

  // Step 2 — Leg fatigue penalty
  if (['Run', 'Bike', 'Leg'].includes(type)) {
    const pool = ctx.legFatiguePool
    if (pool >= 4) score = Math.min(score, 1.4)
    else if (pool >= 2) score -= 1.5
    else if (pool >= 1) score -= 0.5
  }

  // Step 3 — Weekly load penalty (low-load types exempt)
  if (!profile.isLowLoad) {
    score -= loadPenalty(ctx.hardSessionCount)
  }

  // Step 4 — Balance bonus
  score += balanceBonus(type, ctx)

  // Step 5 — Rest urgency override
  const restUrgencyActive = ctx.hardSessionCount >= 5 && ctx.daysSinceLastRestLike >= 4
  if (restUrgencyActive) {
    if (['Rest', 'Mobility', 'Walk'].includes(type)) score = Math.max(score, 3.5)
    else score = Math.min(score, 2.4)
  }

  score = Math.max(0, score)
  const bucket = scoreToBucket(score)
  const reason = buildReason(type, bucket, ctx, restUrgencyActive)
  const warning = buildWarning(type, bucket, ctx)

  return { type, score, bucket, reason, warning }
}

// ─── Step 3: load penalty ─────────────────────────────────────────────────────

function loadPenalty(hardCount: number): number {
  if (hardCount <= 2) return 0
  if (hardCount === 3) return 0.5
  if (hardCount === 4) return 1.0
  if (hardCount === 5) return 1.5
  return 2.0
}

// ─── Step 4: balance bonus ────────────────────────────────────────────────────

const MUSCLE_GROUPS: Record<string, WorkoutType[]> = {
  push:   ['Push'],
  pull:   ['Pull'],
  legs:   ['Leg', 'Run', 'Bike'],
  core:   ['Core'],
  cardio: ['Swim', 'Run', 'Bike'],
}

function balanceBonus(type: WorkoutType, ctx: ScoringContext): number {
  let bonus = 0
  for (const types of Object.values(MUSCLE_GROUPS)) {
    if (!types.includes(type)) continue
    const groupSessions = ctx.last7Days.filter((e) => types.includes(e.type))
    if (groupSessions.length === 0) { bonus += 1.0; continue }
    const mostRecent = [...groupSessions].sort((a, b) => b.timestamp - a.timestamp)[0]
    if (hoursBetween(new Date(mostRecent.timestamp), ctx.now) / 24 >= 5) bonus += 1.0
  }
  return bonus
}

// ─── Score → bucket ───────────────────────────────────────────────────────────

function scoreToBucket(score: number): QualityBucket {
  if (score >= 3.5) return 'Best'
  if (score >= 2.5) return 'Good'
  if (score >= 1.5) return 'Marginal'
  return 'Skip'
}

// ─── Reason strings ───────────────────────────────────────────────────────────

function buildReason(
  type: WorkoutType,
  bucket: QualityBucket,
  ctx: ScoringContext,
  restUrgencyActive: boolean,
): string {
  if (restUrgencyActive) {
    if (type === 'Rest') return "Weekly load is solid. You've earned it — this is not skipping."
    if (type === 'Mobility') return 'Best way to stay active without costing you tomorrow.'
    if (type === 'Walk') return 'Low load, clears your head — exactly what today calls for.'
  }

  const lastSession = ctx.lastSessionByType.get(type)
  const daysSince = lastSession ? hoursBetween(new Date(lastSession.timestamp), ctx.now) / 24 : null

  if (['Walk', 'Mobility', 'Rest'].includes(type)) {
    if (ctx.hardSessionCount >= 4) return `${ctx.hardSessionCount} hard sessions this week — this is the smart choice.`
    return 'Always available. Low load, zero recovery cost.'
  }

  if (['Run', 'Bike', 'Leg'].includes(type) && ctx.legFatiguePool >= 2) {
    const legSession = [...ctx.last7Days]
      .filter((e) => LOAD_PROFILES[e.type].legPoolContribution > 0)
      .sort((a, b) => b.timestamp - a.timestamp)[0]
    if (legSession) {
      const legDays = Math.floor(hoursBetween(new Date(legSession.timestamp), ctx.now) / 24)
      if (bucket === 'Skip') return `Leg fatigue is high — ${legSession.type} on ${dayLabel(legSession.date, ctx.now)} hasn't fully cleared.`
      return `${legDays}d since last leg work — not quite recovered for ${type}.`
    }
  }

  if (daysSince !== null) {
    const days = Math.floor(daysSince)
    if (bucket === 'Skip' || bucket === 'Marginal') return `Only ${days}d since last ${type} — needs more recovery time.`
    if (days >= 5) return `Haven't hit ${type} in ${days} days — well rested, ready to go.`
  }

  if (bucket === 'Marginal' && ctx.hardSessionCount >= 4) return `${ctx.hardSessionCount} hard sessions this week — quality may be reduced.`
  if (bucket === 'Skip' && ctx.hardSessionCount >= 5) return `High weekly load — risk outweighs benefit today.`
  if (daysSince === null) return `No recent ${type} sessions — fully fresh.`
  if (bucket === 'Best') return `Recovery complete and load fits — good moment for ${type}.`
  return `${type} fits today's load.`
}

function buildWarning(type: WorkoutType, bucket: QualityBucket, ctx: ScoringContext): string | undefined {
  if (bucket === 'Best' || bucket === 'Good') return undefined
  if (ctx.hardSessionCount >= 5 && !LOAD_PROFILES[type].isLowLoad) {
    return `High weekly load — ${ctx.hardSessionCount} hard sessions this week.`
  }
  if (['Run', 'Leg'].includes(type) && ctx.legFatiguePool >= 3) {
    return 'Leg fatigue is elevated. Risk of injury outweighs benefit today.'
  }
  return undefined
}

// ─── Add-on detection ─────────────────────────────────────────────────────────

function detectAddon(
  primary: ScoredWorkout,
  ctx: ScoringContext,
  allScored: ScoredWorkout[],
): AddonSuggestion | null {
  if (['Rest', 'Walk', 'Mobility'].includes(primary.type)) return null

  for (const candidate of ['Core', 'Mobility'] as const) {
    if (!ctx.palette.includes(candidate)) continue
    const scored = allScored.find((s) => s.type === candidate)
    if (!scored || (scored.bucket !== 'Best' && scored.bucket !== 'Good')) continue
    if (candidate === 'Core' && primary.type === 'Leg') continue

    const lastSession = ctx.lastSessionByType.get(candidate)
    const daysSinceLast = lastSession
      ? Math.floor(hoursBetween(new Date(lastSession.timestamp), ctx.now) / 24)
      : 7
    const duration = candidate === 'Core' ? 15 : 10
    const reason = candidate === 'Core'
      ? `Haven't hit core in ${daysSinceLast}d — good session to tack on ${duration} min at the end.`
      : `${duration} min mobility at the end will help tomorrow's recovery.`

    return { type: candidate, daysSinceLast, suggestedDurationMinutes: duration, reason }
  }

  return null
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getLast7Days(entries: EngineEntry[], now: Date): EngineEntry[] {
  const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000
  return entries.filter((e) => e.timestamp >= cutoff)
}

function hoursBetween(past: Date, now: Date): number {
  return (now.getTime() - past.getTime()) / (1000 * 60 * 60)
}

function dayLabel(dateStr: string, now: Date): string {
  const date = new Date(dateStr + 'T12:00:00')
  const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (daysAgo === 0) return 'today'
  if (daysAgo === 1) return 'yesterday'
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function getRecommendation(
  history: DayActivity[],
  palette: UserPalette = DEFAULT_PALETTE,
  now: Date = new Date(),
): RecommendationResult | null {
  const allEntries = adaptHistory(history)
  const last7Days = getLast7Days(allEntries, now)

  const activeDays = new Set(last7Days.map((e) => e.date)).size
  if (activeDays < 3) return null

  const ctx = buildScoringContext(last7Days, palette, now)
  const allScored = palette.types.map((type) => scoreWorkoutType(type, ctx))
  allScored.sort((a, b) => b.score - a.score)

  const primary = allScored[0]
  const alternatives = allScored.slice(1)
  const addon = detectAddon(primary, ctx, allScored)

  return {
    primary,
    addon,
    alternatives,
    restUrgency: ctx.hardSessionCount >= 5 && ctx.daysSinceLastRestLike >= 4,
    legFatiguePool: ctx.legFatiguePool,
    hardSessionCount: ctx.hardSessionCount,
  }
}

export function getUserPalette(): UserPalette {
  try {
    const raw = localStorage.getItem('userPalette')
    if (raw) return JSON.parse(raw) as UserPalette
  } catch { /* ignore */ }
  return DEFAULT_PALETTE
}

export function saveUserPalette(palette: UserPalette): void {
  localStorage.setItem('userPalette', JSON.stringify(palette))
}
