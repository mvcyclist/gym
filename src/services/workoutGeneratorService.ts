/**
 * Equipment-aware workout template generation via pattern / accessory pools.
 */
import type { Exercise } from '../types/workout'
import type { GeneratedWorkoutTemplates, UserProfile } from '../types/userProfile'
import {
  canBenchPress,
  exerciseFromCatalogId,
  hasEquipment,
  resolveFromPool,
  type EquipmentProfile,
} from './slotResolver'

type PickInput = EquipmentProfile

function buildFromCatalogId(
  prefix: string,
  index: number,
  catalogId: string,
  sets: string,
  reps: string,
  primaryMuscles: string[],
): Exercise {
  return {
    ...exerciseFromCatalogId(prefix as 'push', index, catalogId, {
      id: `${prefix}-${index}`,
      slotType: 'pattern',
      defaultCatalogExerciseId: catalogId,
      sets,
      reps,
      suggestedRestSeconds: 90,
      primaryMuscles,
    }),
    id: `${prefix}-${index}`,
    sets,
    reps,
    primaryMuscles,
  }
}

export function generatePushExercises(profile: PickInput): Exercise[] {
  const horizontal = resolveFromPool({
    slotType: 'pattern',
    movementPattern: 'horizontal_push',
    loadTier: 'heavy',
    profile,
    preferredCatalogIds: [
      'barbell_bench_press',
      'barbell_floor_press',
      'dumbbell_flat_press',
      'atomic_push_up',
      'close_grip_push_ups',
    ],
    fallbackCatalogId: 'atomic_push_up',
  })

  const vertical = resolveFromPool({
    slotType: 'pattern',
    movementPattern: 'vertical_push',
    loadTier: 'heavy',
    profile,
    preferredCatalogIds: [
      'overhead_press',
      'seated_dumbbell_shoulder_press',
      'arnold_press',
      'trx_pike',
      'atomic_push_up',
    ],
    fallbackCatalogId: 'atomic_push_up',
  })

  const slots: Array<{ catalogId: string; sets: string; reps: string; muscles: string[] }> = [
    { catalogId: horizontal, sets: '3', reps: '6–10', muscles: ['Chest', 'Triceps'] },
    { catalogId: vertical, sets: '3', reps: '6–10', muscles: ['Shoulders', 'Triceps'] },
  ]

  const inclineId = resolveFromPool({
    slotType: 'pattern',
    movementPattern: 'horizontal_push',
    loadTier: 'heavy',
    profile,
    preferredCatalogIds: [
      'dumbbell_incline_press',
      'inclined_barbell_press',
      'trx_pike',
      'close_grip_push_ups',
    ],
  })
  // Only add incline/alternate when it differs from the main horizontal press and gear fits something beyond pure fallback.
  if (
    inclineId !== horizontal &&
    (hasEquipment(profile.equipment, 'bench') ||
      hasEquipment(profile.equipment, 'trx') ||
      hasEquipment(profile.equipment, 'bodyweight') ||
      profile.equipment.length === 0)
  ) {
    const hasInclineGear =
      (hasEquipment(profile.equipment, 'bench') &&
        (hasEquipment(profile.equipment, 'dumbbells') ||
          (hasEquipment(profile.equipment, 'barbell') && hasEquipment(profile.equipment, 'rack')))) ||
      hasEquipment(profile.equipment, 'trx') ||
      hasEquipment(profile.equipment, 'bodyweight') ||
      profile.equipment.length === 0
    if (hasInclineGear) {
      slots.push({
        catalogId: inclineId,
        sets: '3',
        reps: '8–12',
        muscles: ['Upper chest', 'Triceps'],
      })
    }
  }

  if (hasEquipment(profile.equipment, 'dumbbells') && hasEquipment(profile.equipment, 'bench')) {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'accessory',
        accessoryGroup: 'lats',
        profile,
        preferredCatalogIds: ['dumbbell_pullover'],
        fallbackCatalogId: 'dumbbell_pullover',
      }),
      sets: '3',
      reps: '10–12',
      muscles: ['Chest', 'Lats'],
    })
  }

  if (hasEquipment(profile.equipment, 'dumbbells')) {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'accessory',
        accessoryGroup: 'side_delt',
        profile,
        preferredCatalogIds: ['lateral_raises'],
        fallbackCatalogId: 'lateral_raises',
      }),
      sets: '3',
      reps: '12–15',
      muscles: ['Side delts'],
    })
  }

  slots.push({
    catalogId: resolveFromPool({
      slotType: 'accessory',
      accessoryGroup: 'triceps',
      profile,
      preferredCatalogIds: [
        'trx_tricep_extension',
        'overhead_db_tricep_extension',
        'close_grip_push_ups',
      ],
      fallbackCatalogId: 'close_grip_push_ups',
    }),
    sets: '3',
    reps: '10–15',
    muscles: ['Triceps'],
  })

  return slots.map((slot, i) =>
    buildFromCatalogId('push', i + 1, slot.catalogId, slot.sets, slot.reps, slot.muscles),
  )
}

export function generatePullExercises(profile: PickInput): Exercise[] {
  const vertical = resolveFromPool({
    slotType: 'pattern',
    movementPattern: 'vertical_pull',
    loadTier: 'heavy',
    profile,
    preferredCatalogIds: [
      'pull_ups',
      'trx_assisted_pull_up',
      'trx_kneeling_lat_pulldown',
      'trx_rows',
    ],
    fallbackCatalogId: 'trx_rows',
  })

  const slots: Array<{ catalogId: string; sets: string; reps: string; muscles: string[] }> = [
    { catalogId: vertical, sets: '3', reps: '5–10', muscles: ['Lats', 'Biceps'] },
  ]

  if (hasEquipment(profile.equipment, 'barbell') || hasEquipment(profile.equipment, 'dumbbells')) {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'pattern',
        movementPattern: 'horizontal_pull',
        loadTier: 'heavy',
        profile,
        preferredCatalogIds: ['barbell_rows', 'single_dumbbell_arm_rows', 'chest_supported_row'],
        fallbackCatalogId: 'single_dumbbell_arm_rows',
      }),
      sets: '3',
      reps: '8–12',
      muscles: ['Mid back', 'Lats'],
    })
  }

  if (hasEquipment(profile.equipment, 'trx')) {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'accessory',
        accessoryGroup: 'rear_delt',
        profile,
        preferredCatalogIds: ['trx_rear_delt_fly', 'trx_face_pull'],
        fallbackCatalogId: 'trx_rear_delt_fly',
      }),
      sets: '3',
      reps: '12–15',
      muscles: ['Rear delts'],
    })
  }

  if (hasEquipment(profile.equipment, 'barbell') || hasEquipment(profile.equipment, 'dumbbells')) {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'accessory',
        accessoryGroup: 'biceps',
        profile,
        preferredCatalogIds: ['barbell_curls'],
        fallbackCatalogId: 'barbell_curls',
      }),
      sets: '3',
      reps: '8–12',
      muscles: ['Biceps'],
    })
  }

  if (hasEquipment(profile.equipment, 'trx')) {
    for (const id of ['trx_core_1', 'trx_core_2'] as const) {
      slots.push({
        catalogId: id,
        sets: '3',
        reps: '30–45 sec',
        muscles: ['Core'],
      })
    }
  }

  return slots.map((slot, i) =>
    buildFromCatalogId('pull', i + 1, slot.catalogId, slot.sets, slot.reps, slot.muscles),
  )
}

export function generateLegExercises(profile: PickInput): Exercise[] {
  const squat = resolveFromPool({
    slotType: 'pattern',
    movementPattern: 'squat',
    loadTier: 'heavy',
    profile,
    preferredCatalogIds: ['barbell_back_squat', 'goblet_squat', 'bodyweight_squat'],
    fallbackCatalogId: 'bodyweight_squat',
  })

  const hinge = resolveFromPool({
    slotType: 'pattern',
    movementPattern: 'hinge',
    loadTier: 'heavy',
    profile,
    preferredCatalogIds: [
      'barbell_hip_thrust',
      'dumbbell_romanian_deadlift',
      'trx_hip_press',
      'bodyweight_squat',
    ],
    fallbackCatalogId: 'bodyweight_squat',
  })

  const slots: Array<{ catalogId: string; sets: string; reps: string; muscles: string[] }> = [
    { catalogId: squat, sets: squat === 'barbell_back_squat' ? '4' : '3', reps: '8–10', muscles: ['Quads', 'Glutes'] },
    { catalogId: hinge, sets: '3', reps: '8–10', muscles: ['Glutes', 'Hamstrings'] },
  ]

  if (hasEquipment(profile.equipment, 'trx') && hasEquipment(profile.equipment, 'dumbbells')) {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'pattern',
        movementPattern: 'squat',
        loadTier: 'moderate',
        profile,
        preferredCatalogIds: ['trx_weighted_lunge', 'dumbbell_lunges'],
        fallbackCatalogId: 'trx_weighted_lunge',
      }),
      sets: '3',
      reps: '10 each leg',
      muscles: ['Quads', 'Glutes'],
    })
  } else {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'pattern',
        movementPattern: 'squat',
        loadTier: 'low_impact',
        profile,
        preferredCatalogIds: ['bodyweight_squat', 'dumbbell_lunges'],
        fallbackCatalogId: 'bodyweight_squat',
      }),
      sets: '3',
      reps: '10 each leg',
      muscles: ['Quads', 'Glutes'],
    })
  }

  if (hasEquipment(profile.equipment, 'trx')) {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'pattern',
        movementPattern: 'hinge',
        loadTier: 'low_impact',
        profile,
        preferredCatalogIds: ['trx_hamstring_curl'],
        fallbackCatalogId: 'trx_hamstring_curl',
      }),
      sets: '2',
      reps: '10–12',
      muscles: ['Hamstrings'],
    })
  }

  if (hasEquipment(profile.equipment, 'dumbbells')) {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'accessory',
        accessoryGroup: 'calves',
        profile,
        preferredCatalogIds: ['standing_calf_raise'],
        fallbackCatalogId: 'standing_calf_raise',
      }),
      sets: '3',
      reps: '10–15',
      muscles: ['Calves'],
    })
  }

  if (hasEquipment(profile.equipment, 'trx')) {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'accessory',
        accessoryGroup: 'core',
        profile,
        preferredCatalogIds: ['trx_side_tuck'],
        fallbackCatalogId: 'trx_side_tuck',
      }),
      sets: '3',
      reps: '10 each side',
      muscles: ['Core', 'Obliques'],
    })
  }

  return slots.map((slot, i) =>
    buildFromCatalogId('leg', i + 1, slot.catalogId, slot.sets, slot.reps, slot.muscles),
  )
}

export function generateCoreExercises(profile: PickInput): Exercise[] {
  const baseIds = ['plank', 'side_plank', 'dead_bug', 'hollow_hold', 'mountain_climber'] as const
  const slots = baseIds.map((catalogId) => ({
    catalogId,
    sets: '3',
    reps: '30–60 sec',
    muscles: ['Core'],
  }))

  if (hasEquipment(profile.equipment, 'trx')) {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'pattern',
        movementPattern: 'vertical_push',
        loadTier: 'low_impact',
        profile,
        preferredCatalogIds: ['trx_pike'],
        fallbackCatalogId: 'trx_pike',
      }),
      sets: '3',
      reps: '8–12',
      muscles: ['Shoulders', 'Core'],
    })
  } else {
    slots.push({
      catalogId: resolveFromPool({
        slotType: 'accessory',
        accessoryGroup: 'core',
        profile,
        preferredCatalogIds: ['pallof_press'],
        fallbackCatalogId: 'pallof_press',
      }),
      sets: '3',
      reps: '10–12 each side',
      muscles: ['Anti-rotation'],
    })
  }

  return slots.map((slot, i) =>
    buildFromCatalogId('core', i + 1, slot.catalogId, slot.sets, slot.reps, slot.muscles),
  )
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
