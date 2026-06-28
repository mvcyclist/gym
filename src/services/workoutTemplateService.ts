/**
 * Resolves workout templates from history, defaults, generated profile, or random mixes.
 */
import { getDefaultRestSeconds, getCatalogExerciseById } from '../data/exerciseCatalog'
import { workouts } from '../data/workouts'
import type { Exercise, WorkoutCategory } from '../types/workout'
import type { StrengthTemplateKey, TemplateSource, UserProfile } from '../types/userProfile'
import { getLastCompletedSessionByWorkoutType } from './exerciseHistoryService'
import { resolveExerciseLogCatalogId } from './exerciseIdentity'
import { generateWorkoutTemplates } from './workoutGeneratorService'
import { getUserProfile, saveUserProfile } from './userProfileRepository'

export interface TemplateVariant {
  source: TemplateSource
  label: string
  exercises: Exercise[]
  available: boolean
}

const STRENGTH_CATEGORIES: StrengthTemplateKey[] = ['push', 'pull', 'leg', 'core']

const SOURCE_LABELS: Record<TemplateSource, string> = {
  history: 'Your last session',
  default: 'Classic routine',
  generated: 'From your equipment',
  random: 'Random mix',
}

const CYCLE_ORDER: TemplateSource[] = ['history', 'default', 'generated', 'random']

function staticExercises(category: WorkoutCategory): Exercise[] {
  return workouts.find((workout) => workout.id === category)?.exercises ?? []
}

function exerciseFromCatalog(
  category: WorkoutCategory,
  index: number,
  catalogId: string,
  fallback?: Exercise,
): Exercise {
  if (fallback) {
    return { ...fallback, id: `${category}-${index + 1}`, catalogExerciseId: catalogId }
  }

  const catalog = getCatalogExerciseById(catalogId)
  const staticMatch = staticExercises(category).find((item) => item.catalogExerciseId === catalogId)

  return {
    id: `${category}-${index + 1}`,
    catalogExerciseId: catalogId,
    name: catalog?.name ?? staticMatch?.name ?? catalogId,
    primaryMuscles: staticMatch?.primaryMuscles ?? ['General'],
    equipment: staticMatch?.equipment ?? '—',
    sets: staticMatch?.sets ?? '3',
    reps: staticMatch?.reps ?? '8–12',
    suggestedRestSeconds: catalog
      ? getDefaultRestSeconds(catalog)
      : staticMatch?.suggestedRestSeconds ?? 90,
    instructions: staticMatch?.instructions ?? 'Instructions will go here.',
    cues: staticMatch?.cues ?? 'Coaching cues will go here.',
    commonMistakes: staticMatch?.commonMistakes ?? 'Common mistakes will go here.',
  }
}

export function hasHistoryForWorkoutType(category: WorkoutCategory): boolean {
  const session = getLastCompletedSessionByWorkoutType(category)
  return Boolean(session && session.exercises.length > 0)
}

export function hasAnyStrengthHistory(): boolean {
  return STRENGTH_CATEGORIES.some(hasHistoryForWorkoutType)
}

export function buildExercisesFromHistory(category: WorkoutCategory): Exercise[] | null {
  const session = getLastCompletedSessionByWorkoutType(category)
  if (!session || session.exercises.length === 0) return null

  const staticBySlot = new Map(
    staticExercises(category).map((exercise) => [exercise.id, exercise]),
  )

  const orderedIds =
    session.exerciseOrder ??
    session.exercises.map((log) => log.exerciseId)

  const exercises: Exercise[] = []

  orderedIds.forEach((exerciseId, index) => {
    const log = session.exercises.find((item) => item.exerciseId === exerciseId)
    if (!log || log.skipped) return

    const catalogId = resolveExerciseLogCatalogId(log)
    if (!catalogId) return

    exercises.push(
      exerciseFromCatalog(category, index, catalogId, staticBySlot.get(exerciseId)),
    )
  })

  return exercises.length > 0 ? exercises : null
}

function generatedExercises(category: WorkoutCategory, profile: UserProfile): Exercise[] {
  const templates =
    profile.generatedTemplates ?? generateWorkoutTemplates(profile)
  return templates[category]
}

function dedupeByCatalogId(exercises: Exercise[]): Exercise[] {
  const seen = new Set<string>()
  return exercises.filter((exercise) => {
    if (seen.has(exercise.catalogExerciseId)) return false
    seen.add(exercise.catalogExerciseId)
    return true
  })
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function buildRandomExercises(
  category: WorkoutCategory,
  profile: UserProfile,
): Exercise[] {
  const pool = dedupeByCatalogId([
    ...staticExercises(category),
    ...generatedExercises(category, profile),
    ...(buildExercisesFromHistory(category) ?? []),
  ])

  const targetCount = Math.min(
    8,
    Math.max(5, staticExercises(category).length || 5),
  )

  return shuffle(pool)
    .slice(0, Math.min(targetCount, pool.length))
    .map((exercise, index) => ({
      ...exercise,
      id: `${category}-${index + 1}`,
    }))
}

export function getExercisesForSource(
  category: WorkoutCategory,
  source: TemplateSource,
  profile: UserProfile,
): Exercise[] {
  switch (source) {
    case 'history':
      return buildExercisesFromHistory(category) ?? staticExercises(category)
    case 'default':
      return staticExercises(category)
    case 'generated':
      return generatedExercises(category, profile)
    case 'random':
      return buildRandomExercises(category, profile)
    default:
      return staticExercises(category)
  }
}

export function isSourceAvailable(
  category: WorkoutCategory,
  source: TemplateSource,
  profile: UserProfile,
): boolean {
  if (source === 'history') return hasHistoryForWorkoutType(category)
  if (source === 'generated') {
    return profile.equipment.length > 0 || Boolean(profile.generatedTemplates)
  }
  return true
}

export function getTemplateVariants(
  category: WorkoutCategory,
  profile: UserProfile,
): TemplateVariant[] {
  return CYCLE_ORDER.map((source) => ({
    source,
    label: SOURCE_LABELS[source],
    exercises: getExercisesForSource(category, source, profile),
    available: isSourceAvailable(category, source, profile),
  }))
}

export function resolveTemplateSource(
  category: WorkoutCategory,
  profile: UserProfile,
): TemplateSource {
  const selected = profile.templateSources?.[category]
  if (selected && isSourceAvailable(category, selected, profile)) {
    return selected
  }
  if (hasHistoryForWorkoutType(category)) return 'history'
  if (profile.onboardingComplete && profile.equipment.length > 0) return 'generated'
  return 'default'
}

export function defaultTemplateSources(profile: UserProfile): Partial<Record<StrengthTemplateKey, TemplateSource>> {
  const sources: Partial<Record<StrengthTemplateKey, TemplateSource>> = {}
  for (const category of STRENGTH_CATEGORIES) {
    sources[category] = resolveTemplateSource(category, profile)
  }
  return sources
}

export function getWorkoutExercises(
  category: WorkoutCategory,
  profile: UserProfile = getUserProfile(),
): Exercise[] {
  const source = resolveTemplateSource(category, profile)
  return getExercisesForSource(category, source, profile)
}

export function setTemplateSource(category: StrengthTemplateKey, source: TemplateSource): UserProfile {
  const profile = getUserProfile()
  const updated: UserProfile = {
    ...profile,
    templateSources: {
      ...profile.templateSources,
      [category]: source,
    },
  }
  saveUserProfile(updated)
  return updated
}

export function cycleTemplateSource(category: StrengthTemplateKey, profile: UserProfile): TemplateSource {
  const current = resolveTemplateSource(category, profile)
  const currentIndex = CYCLE_ORDER.indexOf(current)
  for (let offset = 1; offset <= CYCLE_ORDER.length; offset += 1) {
    const candidate = CYCLE_ORDER[(currentIndex + offset) % CYCLE_ORDER.length]
    if (isSourceAvailable(category, candidate, profile)) {
      setTemplateSource(category, candidate)
      return candidate
    }
  }
  return current
}

export { SOURCE_LABELS, CYCLE_ORDER, STRENGTH_CATEGORIES }
