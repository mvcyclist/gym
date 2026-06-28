import { toDateString } from '../utils/activityHistory'
import type { UserProfile } from '../types/userProfile'
import { clearUserProfile, getUserProfile, saveUserProfile } from './userProfileRepository'
import { generateWorkoutTemplates } from './workoutGeneratorService'
import { generateDefaultWeeklyPlan } from './weeklyPlanFromProfile'
import { paletteFromProfile } from './paletteFromProfile'
import { saveUserPalette } from './preferencesRepository'
import { updatePlanOverride } from './trainingLedgerService'
import { saveLocalLedger } from '../adapters/localLedgerStorage'
import { getPlanOverrides } from './trainingLedgerService'
import { defaultTemplateSources } from './workoutTemplateService'

function stripForEditSnapshot(profile: UserProfile): UserProfile {
  const { editRoutineSnapshot: _snapshot, onboardingDraft, onboardingStep, ...rest } = profile
  return {
    ...rest,
    onboardingComplete: true,
    onboardingDraft: undefined,
    onboardingStep: undefined,
    editRoutineSnapshot: undefined,
  }
}

export function isEditingRoutine(profile: UserProfile): boolean {
  return Boolean(profile.editRoutineSnapshot)
}

function datesForCurrentWeek(reference = new Date()): string[] {
  const anchor = new Date(reference)
  anchor.setHours(12, 0, 0, 0)
  const sunday = new Date(anchor)
  sunday.setDate(anchor.getDate() - anchor.getDay())
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sunday)
    day.setDate(sunday.getDate() + index)
    return toDateString(day)
  })
}

export function seedPlanOverridesFromProfile(profile: UserProfile): void {
  const existing = getPlanOverrides()
  if (Object.keys(existing).length > 0) return

  const plan = profile.defaultWeeklyPlan ?? generateDefaultWeeklyPlan(profile)
  const dates = datesForCurrentWeek()
  dates.forEach((date, index) => {
    const slot = plan[index]
    if (slot) updatePlanOverride(date, [slot.type])
  })
}

export function completeOnboarding(
  profile: UserProfile,
  options?: { templateSources?: UserProfile['templateSources'] },
): UserProfile {
  const templates = generateWorkoutTemplates(profile)
  const weeklyPlan = generateDefaultWeeklyPlan(profile)
  const templateSources =
    options?.templateSources ??
    profile.templateSources ??
    defaultTemplateSources({ ...profile, generatedTemplates: templates, onboardingComplete: true })

  const completed: UserProfile = {
    ...profile,
    generatedTemplates: templates,
    defaultWeeklyPlan: weeklyPlan,
    templateSources,
    onboardingComplete: true,
    onboardingStep: undefined,
    onboardingDraft: undefined,
    editRoutineSnapshot: undefined,
  }
  saveUserProfile(completed)
  saveUserPalette(paletteFromProfile(completed))
  seedPlanOverridesFromProfile(completed)
  return completed
}

export function saveOnboardingDraft(profile: UserProfile): void {
  // Routine edits are in-memory only until the user finishes — nothing partial is stored.
  if (isEditingRoutine(profile)) return
  saveUserProfile(profile)
}

export function startEditRoutine(): UserProfile {
  const profile = getUserProfile()
  if (!profile.onboardingComplete) {
    return profile
  }

  const updated: UserProfile = {
    ...profile,
    onboardingComplete: false,
    onboardingStep: 1,
    onboardingDraft: undefined,
    editRoutineSnapshot: stripForEditSnapshot(profile),
  }
  saveUserProfile(updated)
  return updated
}

export function cancelEditRoutine(): UserProfile | null {
  const profile = getUserProfile()
  const snapshot = profile.editRoutineSnapshot
  if (!snapshot) return null

  const restored: UserProfile = {
    ...snapshot,
    editRoutineSnapshot: undefined,
    onboardingDraft: undefined,
    onboardingStep: undefined,
    onboardingComplete: true,
  }
  saveUserProfile(restored)
  return restored
}

export function devStartFromScratch(clearHistory: boolean): void {
  clearUserProfile()
  if (clearHistory) {
    saveLocalLedger({
      version: 4,
      sessions: [],
      manualByDate: {},
      planOverridesByDate: {},
    })
  }
}
