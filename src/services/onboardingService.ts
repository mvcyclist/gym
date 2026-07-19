import { toDateString } from '../utils/activityHistory'
import { getProgramType, type UserProfile } from '../types/userProfile'
import { clearUserProfile, getUserProfile, saveUserProfile } from './userProfileRepository'
import { generateWorkoutTemplates } from './workoutGeneratorService'
import { generateWeeklyPlan } from './weeklyPlanFromProfile'
import { paletteFromProfile } from './paletteFromProfile'
import { saveUserPalette } from './preferencesRepository'
import { updatePlanOverride } from './trainingLedgerService'
import { saveLocalLedger } from '../adapters/localLedgerStorage'
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

function datesForForwardWindow(dayCount = 14, reference = new Date()): string[] {
  const anchor = new Date(reference)
  anchor.setHours(12, 0, 0, 0)
  return Array.from({ length: dayCount }, (_, index) => {
    const day = new Date(anchor)
    day.setDate(anchor.getDate() + index)
    return toDateString(day)
  })
}

export function reseedPlanOverridesFromProfile(profile: UserProfile): void {
  const plan = profile.defaultWeeklyPlan ?? generateWeeklyPlan(profile)
  // Seed today + next 13 days so Home's rolling week always has the chosen program.
  datesForForwardWindow(14).forEach((date) => {
    const weekday = new Date(`${date}T12:00:00`).getDay()
    const slot = plan[weekday]
    if (slot) updatePlanOverride(date, [slot.type])
  })
}

export function seedPlanOverridesFromProfile(profile: UserProfile): void {
  reseedPlanOverridesFromProfile(profile)
}

export function completeOnboarding(
  profile: UserProfile,
  options?: { templateSources?: UserProfile['templateSources']; reseedPlan?: boolean },
): UserProfile {
  const templates = generateWorkoutTemplates(profile)
  const weeklyPlan = generateWeeklyPlan(profile)
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
  if (options?.reseedPlan) {
    reseedPlanOverridesFromProfile(completed)
  } else {
    seedPlanOverridesFromProfile(completed)
  }
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

/** Switch from PPL to the static full-body program. Past ledger sessions are unchanged. */
export function migrateToFullBodyProgram(): UserProfile {
  const profile = getUserProfile()
  const weeklyPlan = generateWeeklyPlan({ ...profile, programType: 'full_body' })
  const migrated: UserProfile = {
    ...profile,
    programType: 'full_body',
    defaultWeeklyPlan: weeklyPlan,
    templateSources: {
      ...profile.templateSources,
      full_body: 'default',
    },
    onboardingComplete: true,
    editRoutineSnapshot: undefined,
    onboardingDraft: undefined,
    onboardingStep: undefined,
  }
  saveUserProfile(migrated)
  saveUserPalette(paletteFromProfile(migrated))
  reseedPlanOverridesFromProfile(migrated)
  return migrated
}

export function canMigrateToFullBody(profile: UserProfile = getUserProfile()): boolean {
  return profile.onboardingComplete && getProgramType(profile) === 'ppl'
}
