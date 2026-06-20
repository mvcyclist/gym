import type { DayActivity, WorkoutRecommendation } from '../types/training'
import { formatDayLabel, toDateString } from '../utils/activityHistory'

const MUSCULAR = ['Push', 'Pull', 'Leg'] as const
const CARDIO = ['Swim', 'Bike'] as const
const RECOVERY = ['Walk', 'Mobility', 'Rest'] as const
const HARD_SESSION: readonly string[] = [...MUSCULAR, ...CARDIO]
const ALL_SCORED = [...MUSCULAR, ...CARDIO, ...RECOVERY] as const

type ScoredType = typeof ALL_SCORED[number]

const MS_PER_DAY = 1000 * 60 * 60 * 24

// ─── Step 1: build stats ─────────────────────────────────────────────────────

interface Stats {
  daysSinceLast: Record<string, number | null>
  countLast7Days: Record<string, number>
  lastTwoSessions: string[]
  yesterdaySession: string | null
  sessionsLast3Days: number
  muscularLast2Days: boolean
}

function buildStats(history: DayActivity[], todayStr: string): Stats {
  const todayMs = new Date(todayStr).getTime()
  const ago = (n: number) => toDateString(new Date(todayMs - n * MS_PER_DAY))

  const types = [...ALL_SCORED, 'Core']
  const daysSinceLast: Record<string, number | null> = Object.fromEntries(types.map((t) => [t, null]))
  const countLast7Days: Record<string, number> = Object.fromEntries(types.map((t) => [t, 0]))

  const pastDays = history
    .filter((d) => d.date < todayStr)
    .sort((a, b) => b.date.localeCompare(a.date))

  for (const day of pastDays) {
    const diff = Math.round((todayMs - new Date(day.date).getTime()) / MS_PER_DAY)
    for (const activity of day.activities) {
      const t = activity.type
      if (!(t in daysSinceLast)) continue
      if (daysSinceLast[t] === null) daysSinceLast[t] = diff
      if (day.date >= ago(7)) countLast7Days[t]++
    }
  }

  const lastTwoSessions: string[] = []
  for (const day of pastDays) {
    if (lastTwoSessions.length >= 2) break
    const hard = day.activities.find((a) => HARD_SESSION.includes(a.type))
    if (hard) lastTwoSessions.push(hard.type)
  }

  const yesterdayStr = ago(1)
  const yesterdayDay = history.find((d) => d.date === yesterdayStr)
  const yesterdaySession = yesterdayDay?.activities[0]?.type ?? null

  const sessionsLast3Days = history.filter(
    (d) =>
      d.date >= ago(3) &&
      d.date < todayStr &&
      d.activities.some((a) => HARD_SESSION.includes(a.type)),
  ).length

  const muscularLast2Days = history.some(
    (d) =>
      (d.date === yesterdayStr || d.date === ago(2)) &&
      d.activities.some((a) => (MUSCULAR as readonly string[]).includes(a.type)),
  )

  return { daysSinceLast, countLast7Days, lastTwoSessions, yesterdaySession, sessionsLast3Days, muscularLast2Days }
}

// ─── Step 2: hard constraints ─────────────────────────────────────────────────

function getExcluded(stats: Stats): Set<string> {
  const excluded = new Set<string>()
  const { daysSinceLast, lastTwoSessions } = stats

  // Same-day repeat
  for (const type of MUSCULAR) {
    if (daysSinceLast[type] === 0) excluded.add(type)
  }

  // Three consecutive muscular sessions
  if (
    lastTwoSessions.length >= 2 &&
    (MUSCULAR as readonly string[]).includes(lastTwoSessions[0]) &&
    (MUSCULAR as readonly string[]).includes(lastTwoSessions[1])
  ) {
    for (const type of MUSCULAR) excluded.add(type)
  }

  return excluded
}

// ─── Step 3: base scoring ─────────────────────────────────────────────────────

function computeScores(stats: Stats): Record<string, number> {
  const { daysSinceLast, countLast7Days, yesterdaySession, sessionsLast3Days, muscularLast2Days } = stats
  const scores: Record<string, number> = Object.fromEntries(ALL_SCORED.map((t) => [t, 50]))

  for (const type of MUSCULAR) {
    const d = daysSinceLast[type]
    if (d === null || d > 5) scores[type] += 20
    else if (d >= 4) scores[type] += 15
    else if (d === 3) scores[type] += 10
    else if (d === 2) scores[type] += 5
    else if (d === 1) scores[type] -= 10
    if (countLast7Days[type] >= 2) scores[type] -= 20
  }

  for (const type of CARDIO) {
    const d = daysSinceLast[type]
    if (d === null || d > 4) scores[type] += 25
    else if (d >= 3) scores[type] += 15
    else if (d === 2) scores[type] += 10
    else if (d === 1) scores[type] += 5
    if (countLast7Days[type] >= 2) scores[type] -= 10
  }

  for (const type of RECOVERY) {
    if (sessionsLast3Days >= 3) scores[type] += 30
    if (muscularLast2Days) scores[type] += 20
    if (yesterdaySession && HARD_SESSION.includes(yesterdaySession)) scores[type] += 10
    if (yesterdaySession && (RECOVERY as readonly string[]).includes(yesterdaySession)) scores[type] -= 20
  }

  return scores
}

// ─── Step 4: context modifiers ───────────────────────────────────────────────

function applyModifiers(
  scores: Record<string, number>,
  stats: Stats,
): { scores: Record<string, number>; restRecommended: boolean } {
  const modified = { ...scores }
  const { daysSinceLast, yesterdaySession, sessionsLast3Days } = stats

  if (!yesterdaySession || yesterdaySession === 'Rest') {
    for (const type of [...MUSCULAR, ...CARDIO]) modified[type] += 10
  }

  const bikeDays = daysSinceLast['Bike']
  const swimDays = daysSinceLast['Swim']
  if (bikeDays === null || bikeDays > 5) modified['Bike'] += 20
  if (swimDays === null || swimDays > 5) modified['Swim'] += 20

  return { scores: modified, restRecommended: sessionsLast3Days >= 3 }
}

// ─── Step 5: select ───────────────────────────────────────────────────────────

function selectRecommendation(
  scores: Record<string, number>,
  excluded: Set<string>,
  restRecommended: boolean,
  stats: Stats,
): WorkoutRecommendation {
  const candidates = (ALL_SCORED as readonly string[])
    .filter((t) => !excluded.has(t))
    .sort((a, b) => scores[b] - scores[a]) as ScoredType[]

  const top: ScoredType = candidates[0] ?? 'Mobility'
  const days = stats.daysSinceLast[top]
  const isRecovery = (RECOVERY as readonly string[]).includes(top)

  let reason: string
  if (isRecovery) {
    reason = restRecommended
      ? 'High load recently — recovery fits best today.'
      : 'Light day — good time for mobility or a walk.'
  } else if (days === null || days > 7) {
    reason = `${top} — not done in a while.`
  } else if (days === 1) {
    reason = `${top} — 1 day rest.`
  } else {
    reason = `${top} — ${days} days rest.`
  }

  if (restRecommended && !isRecovery) {
    reason = `Consider recovery today — ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`
  }

  const workoutType: WorkoutRecommendation['workoutType'] =
    top === 'Swim' || top === 'Bike' || top === 'Walk'
      ? 'Mobility'
      : (top as WorkoutRecommendation['workoutType'])

  const title =
    top === 'Walk' || top === 'Mobility' ? 'Mobility & recovery'
    : top === 'Rest' ? 'Rest day'
    : `${top} day`

  return {
    workoutType,
    title,
    reason,
    warnings: restRecommended ? ['High training load this week — listen to your body.'] : undefined,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

function generate(history: DayActivity[], todayStr: string): WorkoutRecommendation {
  const stats = buildStats(history, todayStr)
  const excluded = getExcluded(stats)
  const base = computeScores(stats)
  const { scores, restRecommended } = applyModifiers(base, stats)
  return selectRecommendation(scores, excluded, restRecommended, stats)
}

export function getWorkoutRecommendation(activityHistory: DayActivity[]): WorkoutRecommendation {
  return generate(activityHistory, toDateString(new Date()))
}

export function getTomorrowWorkoutRecommendation(
  activityHistory: DayActivity[],
): WorkoutRecommendation | null {
  const sorted = [...activityHistory].sort((a, b) => a.date.localeCompare(b.date))
  const today = sorted.at(-1)
  if (!today || today.activities.length === 0) return null

  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = toDateString(tomorrowDate)

  const tomorrowSlot: DayActivity = {
    date: tomorrowStr,
    dayLabel: formatDayLabel(tomorrowDate),
    activities: [],
  }

  return generate([...sorted, tomorrowSlot], tomorrowStr)
}

export interface WeeklyPlanDay {
  date: string
  dayLabel: string
  recommendation: WorkoutRecommendation
  displayType: string // Swim/Bike/Push/etc — for color coding, since workoutType maps cardio→Mobility
}

export function getWeeklyPlan(activityHistory: DayActivity[]): WeeklyPlanDay[] {
  const sorted = [...activityHistory].sort((a, b) => a.date.localeCompare(b.date))
  const plan: WeeklyPlanDay[] = []
  const projected = [...sorted]

  // Track what's appeared in the plan for force-fill logic
  const appeared = new Set<string>()
  const mustAppear = [...MUSCULAR, ...CARDIO]
  // Recovery types are excluded from the weekly plan — those are day-of decisions, not planned ahead
  const planExcluded = new Set<string>([...RECOVERY])

  for (let i = 0; i < 7; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = toDateString(date)
    const dayLabel = formatDayLabel(date)

    const daySlot: DayActivity = { date: dateStr, dayLabel, activities: [] }
    const history = [...projected.filter((d) => d.date !== dateStr), daySlot]

    const stats = buildStats(history, dateStr)
    // Day 0 (today): use the real recommendation engine including recovery
    const excluded = i === 0
      ? getExcluded(stats)
      : new Set([...getExcluded(stats), ...planExcluded])
    const base = computeScores(stats)
    const { scores } = applyModifiers(base, stats)

    // Force-fill from day 3 so all types appear within the week
    if (i >= 3) {
      for (const type of mustAppear) {
        if (!appeared.has(type) && !excluded.has(type)) {
          scores[type] = (scores[type] ?? 50) + 150
        }
      }
    }

    const topScorer = (ALL_SCORED as readonly string[])
      .filter((t) => !excluded.has(t))
      .sort((a, b) => scores[b] - scores[a])[0] as ScoredType | undefined

    const displayType = topScorer ?? 'Mobility'
    appeared.add(displayType)

    // Build a clean recommendation for display — no restRecommended noise in the plan
    const days = stats.daysSinceLast[displayType]
    const rec: WorkoutRecommendation = {
      workoutType: (displayType === 'Swim' || displayType === 'Bike')
        ? 'Mobility'
        : (displayType as WorkoutRecommendation['workoutType']),
      title: `${displayType} day`,
      reason: days === null || days > 7
        ? `${displayType} — not done recently.`
        : days <= 1
          ? `${displayType} — ${days} day rest.`
          : `${displayType} — ${days} days rest.`,
    }

    plan.push({ date: dateStr, dayLabel, recommendation: rec, displayType })

    projected.push({
      date: dateStr,
      dayLabel,
      activities: [{
        id: `projected-${dateStr}`,
        date: dateStr,
        type: displayType as DayActivity['activities'][number]['type'],
        intensity: 'Moderate',
        source: 'manual',
      }],
    })
  }

  return plan
}
