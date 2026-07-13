import type { GuidedRoutine } from '../types/guidedRoutine'

const publishedModules = import.meta.glob<GuidedRoutine>('./published/*.json', {
  eager: true,
  import: 'default',
})

function publishedRoutine(id: string): GuidedRoutine | undefined {
  return publishedModules[`./published/${id}.json`]
}

/** Evenly-spaced placeholder chapters until real TTS timestamps are measured. */
function evenChapters(
  entries: Array<{ id: string; title: string; exerciseId?: string }>,
  durationSeconds: number,
): GuidedRoutine['chapters'] {
  const slice = durationSeconds / entries.length
  return entries.map((entry, index) => ({
    ...entry,
    startSeconds: Math.floor(index * slice),
    endSeconds: index === entries.length - 1 ? durationSeconds : Math.floor((index + 1) * slice),
  }))
}

const WARMUP_DURATION = 300
const CORE_DURATION = 600
const MOBILITY_DURATION = 600

const FULL_BODY_WARMUP_V1_DEFAULT: GuidedRoutine = {
  id: 'full_body_warmup_v1',
  title: 'Full Body Warm-up',
  description: 'Dynamic activation before main lifts.',
  segmentType: 'warmup',
  durationSeconds: WARMUP_DURATION,
  audioUrl: '/audio/guided/full_body_warmup_v1.wav',
  transcript: 'Placeholder warm-up script — see content/guided-routines/full_body_warmup_v1.md',
  chapters: evenChapters(
    [
      { id: 'intro', title: 'Introduction' },
      { id: 'arm-circles', title: 'Arm circles', exerciseId: 'warmup_segment' },
      { id: 'leg-swings', title: 'Leg swings' },
      { id: 'squat-to-stand', title: 'Bodyweight squat to stand' },
      { id: 'glute-bridges', title: 'Glute bridges' },
      { id: 'outro', title: 'Outro' },
    ],
    WARMUP_DURATION,
  ),
}

const FULL_BODY_CORE_V1_DEFAULT: GuidedRoutine = {
  id: 'full_body_core_v1',
  title: 'Full Body Core',
  description: 'TRX core circuit — five exercises, two rounds, 30s on / 30s off.',
  segmentType: 'core',
  durationSeconds: CORE_DURATION,
  audioUrl: '/audio/guided/full_body_core_v1.wav',
  transcript: 'Placeholder core script — see content/guided-routines/full_body_core_v1.md',
  chapters: evenChapters(
    [
      { id: 'intro', title: 'Introduction' },
      { id: 'r1-body-saw', title: 'Round 1 — TRX Body Saw', exerciseId: 'core_segment' },
      { id: 'r1-hip-dip-left', title: 'Round 1 — TRX Hip Dip — left' },
      { id: 'r1-hip-dip-right', title: 'Round 1 — TRX Hip Dip — right' },
      { id: 'r1-knee-tuck', title: 'Round 1 — TRX Knee Tuck' },
      { id: 'r1-shoulder-tap', title: 'Round 1 — TRX Plank Shoulder Tap' },
      { id: 'round-two', title: 'Round 2' },
      { id: 'r2-body-saw', title: 'Round 2 — TRX Body Saw' },
      { id: 'r2-hip-dip-left', title: 'Round 2 — TRX Hip Dip — left' },
      { id: 'r2-hip-dip-right', title: 'Round 2 — TRX Hip Dip — right' },
      { id: 'r2-knee-tuck', title: 'Round 2 — TRX Knee Tuck' },
      { id: 'r2-shoulder-tap', title: 'Round 2 — TRX Plank Shoulder Tap' },
      { id: 'outro', title: 'Outro' },
    ],
    CORE_DURATION,
  ),
}

const FULL_BODY_MOBILITY_V1_DEFAULT: GuidedRoutine = {
  id: 'full_body_mobility_v1',
  title: 'Full Body Mobility',
  description: 'TRX-assisted mobility — five holds, about ten minutes.',
  segmentType: 'mobility',
  durationSeconds: MOBILITY_DURATION,
  audioUrl: '/audio/guided/full_body_mobility_v1.wav',
  transcript: 'Placeholder mobility script — see content/guided-routines/full_body_mobility_v1.md',
  chapters: evenChapters(
    [
      { id: 'intro', title: 'Introduction' },
      { id: 'deep-squat-thoracic', title: 'TRX Deep Squat Hold + Thoracic Reach', exerciseId: 'mobility_segment' },
      { id: 'chest-opener', title: 'TRX Chest Opener' },
      { id: 'lat-stretch', title: 'TRX Lat Stretch' },
      { id: 'hamstring-stretch', title: 'TRX Hamstring Stretch' },
      { id: 'hip-flexor-lunge', title: 'TRX Hip Flexor Lunge + Overhead Reach' },
      { id: 'outro', title: 'Outro' },
    ],
    MOBILITY_DURATION,
  ),
}

function resolveRoutine(fallback: GuidedRoutine): GuidedRoutine {
  return publishedRoutine(fallback.id) ?? fallback
}

export const FULL_BODY_WARMUP_V1 = resolveRoutine(FULL_BODY_WARMUP_V1_DEFAULT)
export const FULL_BODY_CORE_V1 = resolveRoutine(FULL_BODY_CORE_V1_DEFAULT)
export const FULL_BODY_MOBILITY_V1 = resolveRoutine(FULL_BODY_MOBILITY_V1_DEFAULT)

export const GUIDED_ROUTINE_FIXTURES: GuidedRoutine[] = [
  FULL_BODY_WARMUP_V1,
  FULL_BODY_CORE_V1,
  FULL_BODY_MOBILITY_V1,
]

const routineById = new Map(GUIDED_ROUTINE_FIXTURES.map((routine) => [routine.id, routine]))

export function getFixtureRoutineById(id: string): GuidedRoutine | undefined {
  return routineById.get(id)
}
