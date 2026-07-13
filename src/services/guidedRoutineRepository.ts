import { getGuidedSegmentBinding, type GuidedSegmentId } from '../data/guidedSegmentBindings'
import { getFixtureRoutineById } from '../fixtures/guidedRoutines'
import { getRoutinePreview } from '../utils/guidedRoutineChapters'
import type { GuidedRoutine } from '../types/guidedRoutine'

export function getGuidedRoutine(id: string): GuidedRoutine | undefined {
  return getFixtureRoutineById(id)
}

export function getDefaultRoutineForSegment(segmentId: GuidedSegmentId): GuidedRoutine {
  const binding = getGuidedSegmentBinding(segmentId)
  const routine = getFixtureRoutineById(binding.defaultRoutineId)
  if (!routine) {
    throw new Error(`Missing guided routine fixture: ${binding.defaultRoutineId}`)
  }
  return routine
}

export function getSegmentRoutinePreview(segmentId: GuidedSegmentId) {
  return getRoutinePreview(getDefaultRoutineForSegment(segmentId))
}
