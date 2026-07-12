import type { ActivityType } from '../types/training'
import { getProgramType, type CardioModalityKey, type UserProfile, type WeeklyPlanSlot } from '../types/userProfile'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const CARDIO_TO_ACTIVITY: Record<Exclude<CardioModalityKey, 'none'>, ActivityType> = {
  swim: 'Swim',
  bike: 'Bike',
  run: 'Run',
  walk: 'Walk',
  hiit: 'HIIT',
}

function activeCardio(profile: UserProfile): ActivityType[] {
  return profile.cardioModalities
    .filter((key): key is Exclude<CardioModalityKey, 'none'> => key !== 'none')
    .map((key) => CARDIO_TO_ACTIVITY[key])
}

function slot(type: ActivityType, meta?: string): WeeklyPlanSlot {
  const label = type === 'Rest' ? 'Rest' : type
  return { type, label, meta }
}

function flexCardioSlot(profile: UserProfile): WeeklyPlanSlot {
  const cardio = activeCardio(profile)
  const hardCardio = cardio.filter((type) => type !== 'Walk')
  const type = hardCardio[0] ?? cardio[0] ?? 'Rest'
  return slot(type, 'Cardio or Rest')
}

/**
 * Full-body program week — Sun=0 … Sat=6
 */
export function generateFullBodyWeeklyPlan(profile: UserProfile): WeeklyPlanSlot[] {
  const flex = flexCardioSlot(profile)
  return [
    flex,
    slot('Full Body', '~80 min'),
    flex,
    slot('Full Body', '~80 min'),
    flex,
    slot('Full Body', '~80 min'),
    flex,
  ]
}

/**
 * PPL weekly plan from onboarding spec (Screen 4).
 * Sun=0 … Sat=6
 */
export function generateDefaultWeeklyPlan(profile: UserProfile): WeeklyPlanSlot[] {
  const cardio = activeCardio(profile)
  const hasWalk = cardio.includes('Walk')
  const hardCardio = cardio.filter((t) => t !== 'Walk')

  const tue: WeeklyPlanSlot = hasWalk
    ? slot('Walk', 'Recovery')
    : slot('Rest')

  let thu: WeeklyPlanSlot = slot('Rest')
  let sat: WeeklyPlanSlot = slot('Rest')

  if (hardCardio.length >= 1) {
    thu = slot(hardCardio[0], 'Cardio')
  }
  if (hardCardio.length >= 2) {
    sat = slot(hardCardio[1], 'Cardio')
  } else if (hardCardio.length === 1 && hasWalk) {
    sat = slot('Walk', 'Recovery')
  }

  return [
    slot('Rest'),
    slot('Push', '~55 min'),
    tue,
    slot('Pull', '~55 min'),
    thu,
    slot('Leg', '~60 min'),
    sat,
  ]
}

export function generateWeeklyPlan(profile: UserProfile): WeeklyPlanSlot[] {
  if (getProgramType(profile) === 'full_body') {
    return generateFullBodyWeeklyPlan(profile)
  }
  return generateDefaultWeeklyPlan(profile)
}

export function weeklyPlanWithDayLabels(plan: WeeklyPlanSlot[]): Array<WeeklyPlanSlot & { dayLabel: string }> {
  return plan.map((entry, index) => ({
    ...entry,
    dayLabel: DAY_LABELS[index],
  }))
}

/** Cardio types in rotation order for recommendations / palette. */
export function cardioTypesFromProfile(profile: UserProfile): ActivityType[] {
  return activeCardio(profile)
}
