import {
  CORE_GUIDED_SEGMENT,
  MOBILITY_SEGMENT,
  WARMUP_SEGMENT,
} from '../data/fullBodySessionPlan'
import type { FullBodySegmentId } from '../types/fullBodySession'
import type { Exercise, ExerciseLog, WorkoutSession } from '../types/workout'
import {
  canJumpToSegment,
  getGuidedSegmentLog,
  isMainSegmentComplete,
  segmentIndex,
} from '../utils/fullBodySessionState'
import { FULL_BODY_SEGMENT_ORDER } from '../types/fullBodySession'

interface FullBodySessionOverviewProps {
  session: WorkoutSession
  mainExercises: Exercise[]
  currentMainExerciseIndex: number
  currentSegment: FullBodySegmentId
  getExerciseLog: (exerciseId: string) => ExerciseLog | undefined
  isExerciseLogged: (exerciseId: string) => boolean
  isExerciseSkipped: (exerciseId: string) => boolean
  onJumpToMainExercise: (index: number) => void
  onJumpToSegment: (segment: FullBodySegmentId) => void
}

const SEGMENT_LABELS: Record<FullBodySegmentId, string> = {
  warmup: WARMUP_SEGMENT.title,
  main: 'Main lifts',
  core: CORE_GUIDED_SEGMENT.title,
  mobility: MOBILITY_SEGMENT.title,
}

function guidedSegmentStatus(
  session: WorkoutSession,
  segmentId: FullBodySegmentId,
  mainExerciseCount: number,
): string {
  if (segmentId === 'main') {
    if (isMainSegmentComplete(session)) return 'Done'
    const done = mainExercisesWithProgress(session, mainExerciseCount)
    return done > 0 ? `${done} exercises` : ''
  }

  const log = getGuidedSegmentLog(
    session,
    segmentId as Exclude<FullBodySegmentId, 'main'>,
  )
  if (!log?.segmentStatus) return ''
  const minutes = Math.max(1, Math.round((log.segmentDurationSeconds ?? 0) / 60))
  return log.segmentStatus === 'partial' ? `Partial · ${minutes}m` : `Done · ${minutes}m`
}

function mainExercisesWithProgress(session: WorkoutSession, total: number): number {
  const completed = session.exercises.filter(
    (log) =>
      !log.isGuidedSegment &&
      !log.skipped &&
      log.sets.length > 0 &&
      log.sets.every((set) => set.completed),
  ).length
  return Math.min(completed, total)
}

export function FullBodySessionOverview({
  session,
  mainExercises,
  currentMainExerciseIndex,
  currentSegment,
  getExerciseLog,
  isExerciseLogged,
  isExerciseSkipped,
  onJumpToMainExercise,
  onJumpToSegment,
}: FullBodySessionOverviewProps) {
  const currentIdx = segmentIndex(currentSegment)

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-44 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Session overview
        </h3>

        <div className="space-y-4">
          {FULL_BODY_SEGMENT_ORDER.map((segmentId) => {
            const segIdx = segmentIndex(segmentId)
            const isCurrent = segmentId === currentSegment
            const isPast = segIdx < currentIdx
            const canJump = canJumpToSegment(session, segmentId)
            const status = guidedSegmentStatus(session, segmentId, mainExercises.length)

            return (
              <div key={segmentId}>
                <button
                  type="button"
                  disabled={!canJump}
                  onClick={() => onJumpToSegment(segmentId)}
                  className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider transition ${
                    isCurrent
                      ? 'bg-red-500/15 text-red-300'
                      : isPast
                        ? 'text-zinc-400 hover:bg-zinc-800'
                        : 'text-zinc-600'
                  } ${canJump ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
                >
                  <span>{SEGMENT_LABELS[segmentId]}</span>
                  {status && <span className="normal-case text-zinc-500">{status}</span>}
                </button>

                {segmentId === 'main' && (
                  <ol className="space-y-1 pl-1">
                    {mainExercises.map((item, index) => {
                      const isActive = segmentId === currentSegment && index === currentMainExerciseIndex
                      const logged = isExerciseLogged(item.id)
                      const skipped = isExerciseSkipped(item.id)
                      const log = getExerciseLog(item.id)
                      const loggedSets = log?.sets.filter((set) => set.completed).length ?? 0
                      const totalSets = log?.sets.length ?? 0
                      const jumpable =
                        segmentId === currentSegment &&
                        (logged || skipped || index <= currentMainExerciseIndex)

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            disabled={!jumpable && !isPast}
                            onClick={() => onJumpToMainExercise(index)}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                              isActive
                                ? 'bg-red-500/10 font-semibold text-red-300'
                                : skipped
                                  ? 'text-yellow-500/80 hover:bg-zinc-800'
                                  : logged
                                    ? 'text-zinc-400 hover:bg-zinc-800'
                                    : 'text-zinc-600 hover:bg-zinc-800'
                            } ${jumpable || isPast ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{item.name}</span>
                              <span className="shrink-0 text-xs text-zinc-500">
                                {skipped
                                  ? 'Skipped'
                                  : logged
                                    ? `${loggedSets}/${totalSets}`
                                    : ''}
                              </span>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                )}

              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
