import { getGuidedSegmentBinding } from './guidedSegmentBindings'
import { getSegmentRoutinePreview } from '../services/guidedRoutineRepository'
import type { FullBodySegmentId } from '../types/fullBodySession'

export const FULL_BODY_MAIN_LIFT_SLOT_IDS = [
  'full_body-1',
  'full_body-2',
  'full_body-3',
  'full_body-4',
  'full_body-5',
  'full_body-6',
] as const

export const MAIN_LIFTS_TRANSITION = {
  title: 'Main lifts',
  subtitle: '6 exercises · ~34 min',
  description: 'Logged sets with suggested weight and progression coaching.',
}

export function segmentTransitionAfter(segmentId: FullBodySegmentId) {
  if (segmentId === 'warmup') return MAIN_LIFTS_TRANSITION
  if (segmentId === 'main') {
    const corePreview = getSegmentRoutinePreview('core')
    return {
      title: getGuidedSegmentBinding('core').title,
      subtitle: corePreview.subtitle,
      description: 'Audio-guided core block.',
    }
  }
  if (segmentId === 'core') {
    const mobilityPreview = getSegmentRoutinePreview('mobility')
    return {
      title: getGuidedSegmentBinding('mobility').title,
      subtitle: mobilityPreview.subtitle,
      description: 'Audio-guided mobility to finish the session.',
    }
  }
  return null
}
