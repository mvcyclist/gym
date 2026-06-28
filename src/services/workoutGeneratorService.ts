/**
 * Pure workout template generation from onboarding equipment + preferences.
 * See onboarding spec Screen 3 exercise generation rules.
 */
import { getDefaultRestSeconds, getCatalogExerciseById } from '../data/exerciseCatalog'
import type { Exercise } from '../types/workout'
import type { EquipmentKey, GeneratedWorkoutTemplates, UserProfile } from '../types/userProfile'

type PickInput = Pick<UserProfile, 'equipment' | 'canBench'>

interface SlotDef {
  catalogId: string
  name: string
  primaryMuscles: string[]
  equipment: string
  sets: string
  reps: string
}

function hasEquipment(equipment: EquipmentKey[], key: EquipmentKey): boolean {
  return equipment.includes(key)
}

function canBenchPress(profile: PickInput): boolean {
  const { equipment, canBench } = profile
  return (
    hasEquipment(equipment, 'barbell') &&
    hasEquipment(equipment, 'bench') &&
    (hasEquipment(equipment, 'rack') || canBench === true)
  )
}

function buildExercise(prefix: string, index: number, slot: SlotDef): Exercise {
  const catalog = getCatalogExerciseById(slot.catalogId)
  return {
    id: `${prefix}-${index}`,
    catalogExerciseId: slot.catalogId,
    name: catalog?.name ?? slot.name,
    primaryMuscles: slot.primaryMuscles,
    equipment: slot.equipment,
    sets: slot.sets,
    reps: slot.reps,
    suggestedRestSeconds: catalog ? getDefaultRestSeconds(catalog) : 90,
    instructions: 'Instructions will go here.',
    cues: 'Coaching cues will go here.',
    commonMistakes: 'Common mistakes will go here.',
  }
}

function pushHorizontalPress(profile: PickInput): SlotDef {
  if (canBenchPress(profile)) {
    return {
      catalogId: 'barbell_bench_press',
      name: 'Barbell Bench Press',
      primaryMuscles: ['Chest', 'Triceps'],
      equipment: 'Barbell, bench',
      sets: '3',
      reps: '6–10',
    }
  }
  if (hasEquipment(profile.equipment, 'barbell')) {
    return {
      catalogId: 'barbell_floor_press',
      name: 'Barbell Floor Press',
      primaryMuscles: ['Chest', 'Triceps'],
      equipment: 'Barbell',
      sets: '3',
      reps: '6–10',
    }
  }
  return {
    catalogId: 'atomic_push_up',
    name: 'Atomic Push-up',
    primaryMuscles: ['Chest', 'Core'],
    equipment: 'Bodyweight',
    sets: '3',
    reps: '8–12',
  }
}

function pushInclinePress(profile: PickInput): SlotDef | null {
  const { equipment } = profile
  if (hasEquipment(equipment, 'bench') && hasEquipment(equipment, 'dumbbells')) {
    return {
      catalogId: 'dumbbell_incline_press',
      name: 'Dumbbell Incline Press',
      primaryMuscles: ['Upper chest', 'Triceps'],
      equipment: 'Dumbbells, bench',
      sets: '3',
      reps: '8–12',
    }
  }
  if (
    hasEquipment(equipment, 'bench') &&
    hasEquipment(equipment, 'barbell') &&
    hasEquipment(equipment, 'rack')
  ) {
    return {
      catalogId: 'inclined_barbell_press',
      name: 'Inclined Barbell Press',
      primaryMuscles: ['Upper chest', 'Triceps'],
      equipment: 'Barbell, incline bench',
      sets: '3',
      reps: '8–12',
    }
  }
  if (hasEquipment(equipment, 'trx')) {
    return {
      catalogId: 'trx_pike',
      name: 'TRX Pike',
      primaryMuscles: ['Shoulders', 'Core'],
      equipment: 'TRX straps',
      sets: '3',
      reps: '8–12',
    }
  }
  if (hasEquipment(equipment, 'bodyweight') || equipment.length === 0) {
    return {
      catalogId: 'close_grip_push_ups',
      name: 'Close-Grip Push-ups',
      primaryMuscles: ['Chest', 'Triceps'],
      equipment: 'Bodyweight',
      sets: '3',
      reps: '10–15',
    }
  }
  return null
}

function pushOhp(profile: PickInput): SlotDef {
  if (hasEquipment(profile.equipment, 'barbell')) {
    return {
      catalogId: 'overhead_press',
      name: 'Overhead Press',
      primaryMuscles: ['Shoulders', 'Triceps'],
      equipment: 'Barbell',
      sets: '3',
      reps: '6–10',
    }
  }
  if (hasEquipment(profile.equipment, 'dumbbells')) {
    return {
      catalogId: 'overhead_press',
      name: 'Overhead Press',
      primaryMuscles: ['Shoulders', 'Triceps'],
      equipment: 'Dumbbells',
      sets: '3',
      reps: '8–12',
    }
  }
  return {
    catalogId: 'atomic_push_up',
    name: 'Atomic Push-up',
    primaryMuscles: ['Chest', 'Core'],
    equipment: 'Bodyweight',
    sets: '3',
    reps: '8–12',
  }
}

function pushTricep(profile: PickInput): SlotDef {
  if (hasEquipment(profile.equipment, 'trx')) {
    return {
      catalogId: 'trx_tricep_extension',
      name: 'TRX Tricep Extension',
      primaryMuscles: ['Triceps'],
      equipment: 'TRX straps',
      sets: '3',
      reps: '10–15',
    }
  }
  if (hasEquipment(profile.equipment, 'dumbbells')) {
    return {
      catalogId: 'overhead_db_tricep_extension',
      name: 'Overhead DB Tricep Extension',
      primaryMuscles: ['Triceps'],
      equipment: 'Dumbbell',
      sets: '3',
      reps: '10–15',
    }
  }
  return {
    catalogId: 'close_grip_push_ups',
    name: 'Close-Grip Push-ups',
    primaryMuscles: ['Chest', 'Triceps'],
    equipment: 'Bodyweight',
    sets: '3',
    reps: '10–15',
  }
}

export function generatePushExercises(profile: PickInput): Exercise[] {
  const slots: SlotDef[] = [pushHorizontalPress(profile), pushOhp(profile)]

  const incline = pushInclinePress(profile)
  if (incline) slots.push(incline)

  if (hasEquipment(profile.equipment, 'dumbbells') && hasEquipment(profile.equipment, 'bench')) {
    slots.push({
      catalogId: 'dumbbell_pullover',
      name: 'Dumbbell Pullover',
      primaryMuscles: ['Chest', 'Lats'],
      equipment: 'Dumbbell, bench',
      sets: '3',
      reps: '10–12',
    })
  }

  if (hasEquipment(profile.equipment, 'dumbbells')) {
    slots.push({
      catalogId: 'lateral_raises',
      name: 'Lateral Raises',
      primaryMuscles: ['Side delts'],
      equipment: 'Dumbbells',
      sets: '3',
      reps: '12–15',
    })
  }

  slots.push(pushTricep(profile))

  return slots.map((slot, i) => buildExercise('push', i + 1, slot))
}

function pullVertical(profile: PickInput): SlotDef {
  if (hasEquipment(profile.equipment, 'pullup')) {
    return {
      catalogId: 'pull_ups',
      name: 'Pull-ups',
      primaryMuscles: ['Lats', 'Biceps'],
      equipment: 'Pull-up bar',
      sets: '3',
      reps: '5–10',
    }
  }
  if (hasEquipment(profile.equipment, 'trx')) {
    return {
      catalogId: 'trx_rows',
      name: 'TRX Rows',
      primaryMuscles: ['Lats', 'Mid back'],
      equipment: 'TRX straps',
      sets: '3',
      reps: '8–12',
    }
  }
  return {
    catalogId: 'trx_rows',
    name: 'TRX Rows',
    primaryMuscles: ['Lats', 'Mid back'],
    equipment: 'Bodyweight',
    sets: '3',
    reps: '8–12',
  }
}

export function generatePullExercises(profile: PickInput): Exercise[] {
  const slots: SlotDef[] = [pullVertical(profile)]

  if (hasEquipment(profile.equipment, 'barbell')) {
    slots.push({
      catalogId: 'barbell_rows',
      name: 'Barbell Rows',
      primaryMuscles: ['Mid back', 'Lats'],
      equipment: 'Barbell',
      sets: '3',
      reps: '8–12',
    })
  } else if (hasEquipment(profile.equipment, 'dumbbells')) {
    slots.push({
      catalogId: 'single_dumbbell_arm_rows',
      name: 'Single Dumbbell Arm Rows',
      primaryMuscles: ['Lats', 'Mid back'],
      equipment: 'Dumbbell, bench',
      sets: '3',
      reps: '8–12 each',
    })
  }

  if (hasEquipment(profile.equipment, 'trx')) {
    slots.push({
      catalogId: 'trx_rear_delt_fly',
      name: 'TRX Rear Delt Fly',
      primaryMuscles: ['Rear delts'],
      equipment: 'TRX straps',
      sets: '3',
      reps: '12–15',
    })
  }

  if (hasEquipment(profile.equipment, 'barbell')) {
    slots.push({
      catalogId: 'barbell_curls',
      name: 'Barbell Curls',
      primaryMuscles: ['Biceps'],
      equipment: 'Barbell',
      sets: '3',
      reps: '8–12',
    })
  } else if (hasEquipment(profile.equipment, 'dumbbells')) {
    slots.push({
      catalogId: 'barbell_curls',
      name: 'Barbell Curls',
      primaryMuscles: ['Biceps'],
      equipment: 'Dumbbells',
      sets: '3',
      reps: '10–12',
    })
  }

  if (hasEquipment(profile.equipment, 'trx')) {
    for (const id of ['trx_core_1', 'trx_core_2'] as const) {
      slots.push({
        catalogId: id,
        name: id === 'trx_core_1' ? 'TRX Core 1' : 'TRX Core 2',
        primaryMuscles: ['Core'],
        equipment: 'TRX straps',
        sets: '3',
        reps: '30–45 sec',
      })
    }
  }

  return slots.map((slot, i) => buildExercise('pull', i + 1, slot))
}

function legSquat(profile: PickInput): SlotDef {
  if (hasEquipment(profile.equipment, 'barbell') && hasEquipment(profile.equipment, 'rack')) {
    return {
      catalogId: 'barbell_back_squat',
      name: 'Barbell Back Squat',
      primaryMuscles: ['Quads', 'Glutes', 'Core'],
      equipment: 'Barbell, rack',
      sets: '4',
      reps: '8–10',
    }
  }
  if (hasEquipment(profile.equipment, 'dumbbells')) {
    return {
      catalogId: 'goblet_squat',
      name: 'Goblet Squat',
      primaryMuscles: ['Quads', 'Glutes'],
      equipment: 'Dumbbell',
      sets: '3',
      reps: '10–12',
    }
  }
  return {
    catalogId: 'bodyweight_squat',
    name: 'Bodyweight Squat',
    primaryMuscles: ['Quads', 'Glutes'],
    equipment: 'Bodyweight',
    sets: '3',
    reps: '12–15',
  }
}

function legHipHinge(profile: PickInput): SlotDef {
  if (hasEquipment(profile.equipment, 'barbell')) {
    return {
      catalogId: 'barbell_hip_thrust',
      name: 'Barbell Hip Thrust',
      primaryMuscles: ['Glutes', 'Hamstrings'],
      equipment: 'Barbell, bench',
      sets: '3',
      reps: '8–10',
    }
  }
  if (hasEquipment(profile.equipment, 'dumbbells')) {
    return {
      catalogId: 'barbell_hip_thrust',
      name: 'Dumbbell Hip Thrust',
      primaryMuscles: ['Glutes', 'Hamstrings'],
      equipment: 'Dumbbell, bench',
      sets: '3',
      reps: '10–12',
    }
  }
  return {
    catalogId: 'bodyweight_squat',
    name: 'Glute Bridge',
    primaryMuscles: ['Glutes', 'Hamstrings'],
    equipment: 'Bodyweight',
    sets: '3',
    reps: '12–15',
  }
}

export function generateLegExercises(profile: PickInput): Exercise[] {
  const slots: SlotDef[] = [
    legSquat(profile),
    legHipHinge(profile),
  ]

  if (hasEquipment(profile.equipment, 'trx') && hasEquipment(profile.equipment, 'dumbbells')) {
    slots.push({
      catalogId: 'trx_weighted_lunge',
      name: 'TRX Weighted Lunge',
      primaryMuscles: ['Quads', 'Glutes'],
      equipment: 'TRX, dumbbells',
      sets: '3',
      reps: '10 each leg',
    })
  } else {
    slots.push({
      catalogId: 'bodyweight_squat',
      name: 'Walking Lunges',
      primaryMuscles: ['Quads', 'Glutes'],
      equipment: 'Bodyweight',
      sets: '3',
      reps: '10 each leg',
    })
  }

  if (hasEquipment(profile.equipment, 'trx')) {
    slots.push({
      catalogId: 'trx_hamstring_curl',
      name: 'TRX Hamstring Curl',
      primaryMuscles: ['Hamstrings'],
      equipment: 'TRX',
      sets: '2',
      reps: '10–12',
    })
  }

  if (hasEquipment(profile.equipment, 'dumbbells')) {
    slots.push({
      catalogId: 'standing_calf_raise',
      name: 'Standing Calf Raise',
      primaryMuscles: ['Calves'],
      equipment: 'Dumbbells',
      sets: '3',
      reps: '10–15',
    })
  }

  if (hasEquipment(profile.equipment, 'trx')) {
    slots.push({
      catalogId: 'trx_side_tuck',
      name: 'TRX Side Tuck',
      primaryMuscles: ['Core', 'Obliques'],
      equipment: 'TRX',
      sets: '3',
      reps: '10 each side',
    })
  }

  return slots.map((slot, i) => buildExercise('leg', i + 1, slot))
}

export function generateCoreExercises(profile: PickInput): Exercise[] {
  const base: SlotDef[] = [
    { catalogId: 'plank', name: 'Plank', primaryMuscles: ['Abs'], equipment: 'Bodyweight', sets: '3', reps: '30–60 sec' },
    { catalogId: 'side_plank', name: 'Side Plank', primaryMuscles: ['Obliques'], equipment: 'Bodyweight', sets: '3', reps: '20–40 sec each' },
    { catalogId: 'dead_bug', name: 'Dead Bug', primaryMuscles: ['Deep core'], equipment: 'Bodyweight', sets: '3', reps: '8–12 each side' },
    { catalogId: 'hollow_hold', name: 'Hollow Hold', primaryMuscles: ['Abs'], equipment: 'Bodyweight', sets: '3', reps: '20–40 sec' },
    { catalogId: 'mountain_climber', name: 'Mountain Climber', primaryMuscles: ['Core'], equipment: 'Bodyweight', sets: '3', reps: '20–30 sec' },
  ]

  if (hasEquipment(profile.equipment, 'trx')) {
    base.push({
      catalogId: 'trx_pike',
      name: 'TRX Pike',
      primaryMuscles: ['Shoulders', 'Core'],
      equipment: 'TRX straps',
      sets: '3',
      reps: '8–12',
    })
  } else {
    base.push({
      catalogId: 'pallof_press',
      name: 'Pallof Press',
      primaryMuscles: ['Anti-rotation'],
      equipment: 'Bodyweight',
      sets: '3',
      reps: '10–12 each side',
    })
  }

  return base.map((slot, i) => buildExercise('core', i + 1, slot))
}

export function generateWorkoutTemplates(profile: PickInput): GeneratedWorkoutTemplates {
  return {
    push: generatePushExercises(profile),
    pull: generatePullExercises(profile),
    leg: generateLegExercises(profile),
    core: generateCoreExercises(profile),
  }
}

/** Human-readable exercise names for onboarding preview. */
export function formatExerciseList(exercises: Exercise[]): string {
  return exercises.map((e) => e.name).join(', ')
}

export { canBenchPress, hasEquipment }
