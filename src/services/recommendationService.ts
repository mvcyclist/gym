import type {
  ActivityEntry,
  ActivityType,
  DayActivity,
  RecommendedWorkoutType,
  WorkoutRecommendation,
} from '../types/training'

const STRENGTH_TYPES: ActivityType[] = ['Push', 'Pull', 'Leg', 'Core']

// TODO: Replace placeholder rules with AI-based recommendation engine.
// TODO: Add wearable activity import (Garmin, Apple Health, Strava, etc.).
// TODO: Add user-reported soreness, fatigue, available time, and goals.
// TODO: Add tool-calling/API integration for richer recommendations.

export function getWorkoutRecommendation(activityHistory: DayActivity[]): WorkoutRecommendation {
  const sortedDays = [...activityHistory].sort((a, b) => a.date.localeCompare(b.date))
  const yesterday = sortedDays.at(-2)
  const today = sortedDays.at(-1)

  const warnings: string[] = []

  if (hasThreeConsecutiveHardDays(sortedDays)) {
    return buildRecommendation(
      'Mobility',
      'Mobility & recovery',
      'You have had three hard training days in a row. Prioritize recovery today.',
      warnings,
      'Lite',
    )
  }

  if (yesterday && dayHadPartialStrength(yesterday)) {
    warnings.push('Partial strength session yesterday — consider recovery or a lighter day.')
    return buildRecommendation(
      pickAlternate(['Mobility', 'Push'], findMostRecentStrength(sortedDays)),
      'Recovery or light strength',
      'You cut a strength session short yesterday. Mobility or a lighter workout may fit better today.',
      warnings,
      'Lite',
    )
  }

  if (yesterday && hadHardBike(yesterday)) {
    warnings.push('Hard cycling yesterday — leg day is deprioritized.')
    return buildRecommendation(
      pickAlternate(['Pull', 'Push'], findMostRecentStrength(sortedDays)),
      'Upper-body strength',
      'You biked hard yesterday, so pull or push keeps loading balanced without stacking leg stress.',
      warnings,
    )
  }

  if (yesterday && dayIncludesType(yesterday, 'Leg')) {
    return buildRecommendation(
      pickAlternate(['Pull', 'Push'], findMostRecentStrength(sortedDays)),
      'Upper-body strength',
      'You trained legs recently, so pull or push is a better fit today.',
      warnings,
    )
  }

  if (yesterday && isRecoveryDay(yesterday)) {
    const nextStrength = getNextStrengthAfterRecovery(findMostRecentStrength(sortedDays))
    return buildRecommendation(
      nextStrength,
      `${nextStrength} day`,
      'Yesterday was lighter activity, so you are ready for a strength session.',
      warnings,
    )
  }

  const mostRecentStrength = findMostRecentStrength(sortedDays)
  if (mostRecentStrength === 'Push') {
    return buildRecommendation('Pull', 'Pull day', 'Your last strength session was push, so pull balances the week.', warnings)
  }
  if (mostRecentStrength === 'Pull') {
    return buildRecommendation(
      pickAlternate(['Leg', 'Push'], null),
      'Leg or push day',
      'Your last strength session was pull — legs or push are good options today.',
      warnings,
    )
  }
  if (mostRecentStrength === 'Leg') {
    return buildRecommendation(
      pickAlternate(['Pull', 'Push'], null),
      'Upper-body strength',
      'Your last strength session was legs, so pull or push keeps the week balanced.',
      warnings,
    )
  }
  if (mostRecentStrength === 'Core') {
    return buildRecommendation('Pull', 'Pull day', 'Core was your last strength focus — pull is a solid follow-up.', warnings)
  }

  if (today && today.activities.length === 0) {
    return buildRecommendation('Pull', 'Pull day', 'No activity logged yet today — pull is a balanced default to start the week.', warnings)
  }

  return buildRecommendation('Push', 'Push day', 'Based on your recent training mix, push is a good default for today.', warnings)
}

function buildRecommendation(
  workoutType: RecommendedWorkoutType,
  title: string,
  reason: string,
  warnings: string[],
  variant?: WorkoutRecommendation['variant'],
): WorkoutRecommendation {
  const fullTitle =
    workoutType === 'Rest'
      ? 'Rest day'
      : workoutType === 'Mobility'
        ? title
        : variant && variant !== 'Full'
          ? `${variant} ${title}`
          : title.endsWith('day')
            ? title
            : `${title}`

  return {
    workoutType,
    variant,
    title: fullTitle,
    reason,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

function isRecoveryDay(day: DayActivity): boolean {
  return day.activities.every(
    (activity) =>
      activity.type === 'Rest' ||
      activity.type === 'Walk' ||
      (activity.type === 'Mobility' && activity.intensity !== 'Hard'),
  )
}

function dayHadPartialStrength(day: DayActivity): boolean {
  return day.activities.some(
    (activity) =>
      STRENGTH_TYPES.includes(activity.type) && activity.sessionStatus === 'partial',
  )
}

function hadHardBike(day: DayActivity): boolean {
  return day.activities.some(
    (activity) => activity.type === 'Bike' && activity.intensity === 'Hard',
  )
}

function dayIncludesType(day: DayActivity, type: ActivityType): boolean {
  return day.activities.some((activity) => activity.type === type)
}

function isHardActivity(activity: ActivityEntry): boolean {
  if (activity.intensity === 'Hard') return true
  if (activity.sessionStatus === 'partial' && activity.intensity === 'Easy') return false
  if (activity.type === 'Walk' || activity.type === 'Rest') return false
  if (activity.type === 'Mobility' && activity.intensity === 'Easy') return false

  if (STRENGTH_TYPES.includes(activity.type)) {
    return activity.intensity !== 'Easy'
  }

  if (activity.type === 'Bike' || activity.type === 'Swim') {
    return activity.intensity === 'Moderate'
  }

  return false
}

function isHardDay(day: DayActivity): boolean {
  return day.activities.some(isHardActivity)
}

function hasThreeConsecutiveHardDays(days: DayActivity[]): boolean {
  const recent = days.slice(-4, -1)
  if (recent.length < 3) return false
  return recent.every(isHardDay)
}

function findMostRecentStrength(days: DayActivity[]): ActivityType | null {
  for (let index = days.length - 2; index >= 0; index -= 1) {
    const day = days[index]
    for (const activity of [...day.activities].reverse()) {
      if (STRENGTH_TYPES.includes(activity.type)) {
        return activity.type
      }
    }
  }
  return null
}

function getNextStrengthAfterRecovery(
  lastStrength: ActivityType | null,
): RecommendedWorkoutType {
  if (lastStrength === 'Push') return 'Pull'
  if (lastStrength === 'Pull') return 'Leg'
  if (lastStrength === 'Leg') return 'Push'
  if (lastStrength === 'Core') return 'Pull'
  return 'Push'
}

function pickAlternate(
  options: RecommendedWorkoutType[],
  avoid: ActivityType | null,
): RecommendedWorkoutType {
  if (avoid) {
    const filtered = options.filter((option) => option !== avoid)
    if (filtered.length > 0) return filtered[0]
  }
  return options[0]
}
