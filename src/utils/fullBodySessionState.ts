import {
  CORE_GUIDED_SEGMENT,
  MOBILITY_SEGMENT,
  WARMUP_SEGMENT,
} from '../data/fullBodySessionPlan'
import type { FullBodySegmentId, GuidedSegmentDefinition } from '../types/fullBodySession'
import type { ExerciseLog, WorkoutSession } from '../types/workout'
import { FULL_BODY_SEGMENT_ORDER } from '../types/fullBodySession'
import { findResumeExerciseIndex } from './workoutResume'

export function isStructuredFullBodySession(session: WorkoutSession | null): boolean {
  return Boolean(session?.workoutType === 'full_body' && session.fullBody)
}

export function getGuidedSegmentForId(
  id: Exclude<FullBodySegmentId, 'main'>,
): GuidedSegmentDefinition {
  if (id === 'warmup') return WARMUP_SEGMENT
  if (id === 'core') return CORE_GUIDED_SEGMENT
  return MOBILITY_SEGMENT
}

export function isGuidedSegmentId(segmentId: FullBodySegmentId): segmentId is Exclude<FullBodySegmentId, 'main'> {
  return segmentId !== 'main'
}

export function getGuidedSegmentLog(
  session: WorkoutSession,
  segmentId: Exclude<FullBodySegmentId, 'main'>,
): ExerciseLog | undefined {
  const def = getGuidedSegmentForId(segmentId)
  return session.exercises.find((log) => log.exerciseId === def.exerciseId)
}

export function isGuidedSegmentDone(
  session: WorkoutSession,
  segmentId: Exclude<FullBodySegmentId, 'main'>,
): boolean {
  const log = getGuidedSegmentLog(session, segmentId)
  return Boolean(log?.segmentStatus)
}

export function segmentIndex(segmentId: FullBodySegmentId): number {
  return FULL_BODY_SEGMENT_ORDER.indexOf(segmentId)
}

export function canJumpToSegment(
  session: WorkoutSession,
  target: FullBodySegmentId,
): boolean {
  const current = session.fullBody?.currentSegment ?? 'warmup'
  const currentIdx = segmentIndex(current)
  const targetIdx = segmentIndex(target)
  if (targetIdx < currentIdx) return true
  if (targetIdx > currentIdx) return false
  return target === current
}

export function nextSegmentId(segmentId: FullBodySegmentId): FullBodySegmentId | null {
  const idx = segmentIndex(segmentId)
  return FULL_BODY_SEGMENT_ORDER[idx + 1] ?? null
}

/** Advance past guided segments that are already logged (fixes resume / stale currentSegment). */
export function reconcileFullBodySegment(session: WorkoutSession): FullBodySegmentId {
  let segment: FullBodySegmentId = session.fullBody?.currentSegment ?? 'warmup'

  while (isGuidedSegmentId(segment)) {
    if (segment === 'mobility') break
    if (!isGuidedSegmentDone(session, segment)) break
    const next = nextSegmentId(segment)
    if (!next) break
    segment = next
  }

  return segment
}

export function hasWorkoutProgress(session: WorkoutSession): boolean {
  const hasGuided = session.exercises.some((log) => log.isGuidedSegment && log.segmentStatus)
  const hasSets = session.exercises.some((log) =>
    !log.isGuidedSegment && log.sets.some((set) => set.completed),
  )
  return hasGuided || hasSets
}

export function mainLiftExerciseIds(session: WorkoutSession): string[] {
  return session.exercises
    .filter((log) => !log.isGuidedSegment)
    .map((log) => log.exerciseId)
}

export function findMainLiftResumeIndex(session: WorkoutSession): number {
  const ids = mainLiftExerciseIds(session)
  return findResumeExerciseIndex(session, ids)
}

export function isMainSegmentComplete(session: WorkoutSession): boolean {
  const ids = mainLiftExerciseIds(session)
  if (ids.length === 0) return false
  return ids.every((id) => {
    const log = session.exercises.find((item) => item.exerciseId === id)
    if (!log || log.skipped) return true
    return log.sets.length > 0 && log.sets.every((set) => set.completed)
  })
}
