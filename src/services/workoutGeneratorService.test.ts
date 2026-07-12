import { describe, expect, it } from 'vitest'
import type { UserProfile } from '../types/userProfile'
import { emptyUserProfile } from '../types/userProfile'
import {
  canBenchPress,
  generatePushExercises,
  generatePullExercises,
  generateLegExercises,
  generateWorkoutTemplates,
} from './workoutGeneratorService'
import { generateDefaultWeeklyPlan, generateFullBodyWeeklyPlan } from './weeklyPlanFromProfile'
import { paletteFromProfile } from './paletteFromProfile'

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...emptyUserProfile(),
    onboardingComplete: true,
    ...overrides,
  }
}

describe('canBenchPress', () => {
  it('requires barbell, bench, and rack or explicit canBench', () => {
    expect(
      canBenchPress({ equipment: ['barbell', 'bench', 'rack'], canBench: null }),
    ).toBe(true)
    expect(
      canBenchPress({ equipment: ['barbell', 'bench'], canBench: true }),
    ).toBe(true)
    expect(
      canBenchPress({ equipment: ['barbell', 'bench'], canBench: false }),
    ).toBe(false)
    expect(
      canBenchPress({ equipment: ['barbell', 'bench'], canBench: null }),
    ).toBe(false)
  })
})

describe('generatePushExercises', () => {
  it('uses bench press when rack + bench + barbell', () => {
    const exercises = generatePushExercises({
      equipment: ['barbell', 'bench', 'rack'],
      canBench: null,
    })
    expect(exercises[0].catalogExerciseId).toBe('barbell_bench_press')
  })

  it('falls back to floor press when barbell + bench without rack and canBench false', () => {
    const exercises = generatePushExercises({
      equipment: ['barbell', 'bench'],
      canBench: false,
    })
    expect(exercises[0].catalogExerciseId).toBe('barbell_floor_press')
  })

  it('uses bodyweight push when no barbell', () => {
    const exercises = generatePushExercises({
      equipment: ['bodyweight'],
      canBench: null,
    })
    expect(exercises[0].catalogExerciseId).toBe('atomic_push_up')
  })
})

describe('generatePullExercises', () => {
  it('prefers pull-ups when pull-up bar available', () => {
    const exercises = generatePullExercises({
      equipment: ['pullup', 'barbell'],
      canBench: null,
    })
    expect(exercises[0].catalogExerciseId).toBe('pull_ups')
  })
})

describe('generateLegExercises', () => {
  it('uses back squat with barbell and rack', () => {
    const exercises = generateLegExercises({
      equipment: ['barbell', 'rack'],
      canBench: null,
    })
    expect(exercises[0].catalogExerciseId).toBe('barbell_back_squat')
  })

  it('uses goblet squat with dumbbells only', () => {
    const exercises = generateLegExercises({
      equipment: ['dumbbells'],
      canBench: null,
    })
    expect(exercises[0].catalogExerciseId).toBe('goblet_squat')
  })
})

describe('generateWorkoutTemplates', () => {
  it('returns all four strength templates', () => {
    const templates = generateWorkoutTemplates({
      equipment: ['dumbbells', 'trx'],
      canBench: null,
    })
    expect(templates.push.length).toBeGreaterThan(0)
    expect(templates.pull.length).toBeGreaterThan(0)
    expect(templates.leg.length).toBeGreaterThan(0)
    expect(templates.core.length).toBeGreaterThanOrEqual(5)
  })
})

describe('generateDefaultWeeklyPlan', () => {
  it('places Walk on Tuesday when walk is selected', () => {
    const plan = generateDefaultWeeklyPlan(
      profile({ cardioModalities: ['walk'] }),
    )
    expect(plan[2].type).toBe('Walk')
  })

  it('rotates hard cardio to Thu and Sat', () => {
    const plan = generateDefaultWeeklyPlan(
      profile({ cardioModalities: ['run', 'hiit'] }),
    )
    expect(plan[4].type).toBe('Run')
    expect(plan[6].type).toBe('HIIT')
  })

  it('includes HIIT in rotation like other cardio modalities', () => {
    const plan = generateDefaultWeeklyPlan(
      profile({ cardioModalities: ['hiit', 'swim'] }),
    )
    expect(plan[4].type).toBe('HIIT')
    expect(plan[6].type).toBe('Swim')
  })

  it('uses Rest for cardio slots when none selected', () => {
    const plan = generateDefaultWeeklyPlan(
      profile({ cardioModalities: ['none'] }),
    )
    expect(plan[4].type).toBe('Rest')
    expect(plan[6].type).toBe('Rest')
  })

  it('keeps strength days fixed', () => {
    const plan = generateDefaultWeeklyPlan(profile())
    expect(plan[1].type).toBe('Push')
    expect(plan[3].type).toBe('Pull')
    expect(plan[5].type).toBe('Leg')
  })
})

describe('generateFullBodyWeeklyPlan', () => {
  it('places Full Body on Mon, Wed, Fri with flex cardio days', () => {
    const plan = generateFullBodyWeeklyPlan(profile({ cardioModalities: ['run'] }))
    expect(plan[1].type).toBe('Full Body')
    expect(plan[3].type).toBe('Full Body')
    expect(plan[5].type).toBe('Full Body')
    expect(plan[2].type).toBe('Run')
    expect(plan[2].meta).toBe('Cardio or Rest')
  })
})

describe('paletteFromProfile', () => {
  it('includes HIIT when user selected it during onboarding', () => {
    const palette = paletteFromProfile(
      profile({ cardioModalities: ['run', 'hiit'] }),
    )
    expect(palette.types).toContain('HIIT')
    expect(palette.types).toContain('Run')
  })

  it('returns default palette when onboarding incomplete', () => {
    const palette = paletteFromProfile(emptyUserProfile())
    expect(palette.types).toContain('HIIT')
    expect(palette.types).toContain('Swim')
  })

  it('omits mobility when user opted out', () => {
    const palette = paletteFromProfile(
      profile({ wantsMobility: false, cardioModalities: ['none'] }),
    )
    expect(palette.types).not.toContain('Mobility')
  })

  it('uses Full Body only for full_body program', () => {
    const palette = paletteFromProfile(
      profile({ programType: 'full_body', cardioModalities: ['run'] }),
    )
    expect(palette.types).toContain('Full Body')
    expect(palette.types).not.toContain('Push')
    expect(palette.types).not.toContain('Core')
    expect(palette.types).not.toContain('Mobility')
  })
})
