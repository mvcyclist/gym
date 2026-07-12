import { useCallback, useEffect, type ReactNode } from 'react'
import { getWorkoutById } from '../data/workouts'
import type { Exercise, ExerciseLog, SetLog, WorkoutSession } from '../types/workout'
import type { FullBodySegmentId } from '../types/fullBodySession'
import {
  canJumpToSegment,
  getGuidedSegmentForId,
  isGuidedSegmentDone,
  isGuidedSegmentId,
  isMainSegmentComplete,
  nextSegmentId,
  reconcileFullBodySegment,
} from '../utils/fullBodySessionState'
import { canAdvanceFromExercise } from '../utils/sessionMetrics'
import { FullBodySessionOverview } from './FullBodySessionOverview'
import { GuidedSegmentView } from './GuidedSegmentView'
import { WorkoutDeck } from './WorkoutDeck'

function FullBodySessionLayout({
  main,
  overview,
}: {
  main: ReactNode
  overview: ReactNode
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">{main}</div>
        {overview}
      </div>
    </section>
  )
}

interface FullBodyWorkoutFlowProps {
  session: WorkoutSession
  mainExercises: Exercise[]
  currentMainExerciseIndex: number
  onMainExerciseIndexChange: (index: number) => void
  getExerciseLog: (exerciseId: string) => ExerciseLog | undefined
  onUpdateSet: (
    exerciseId: string,
    setNumber: number,
    updates: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  onPrefillSets: (exerciseId: string, weight: string, reps: string) => void
  onCompleteSet: (
    exerciseId: string,
    setNumber: number,
    updates?: Partial<Pick<SetLog, 'weight' | 'reps'>>,
  ) => void
  onAddSet: (exerciseId: string) => void
  onDeleteSet: (exerciseId: string, setNumber: number) => void
  onSkipExercise: (exerciseId: string) => void
  onRemoveExercise: (exerciseId: string) => void
  onReorderExercises: (newOrder: string[]) => void
  isExerciseLogged: (exerciseId: string) => boolean
  isExerciseSkipped: (exerciseId: string) => boolean
  setFullBodySegment: (segment: FullBodySegmentId) => WorkoutSession | null
  updateFullBodyGuidedState: (
    updates: Partial<NonNullable<WorkoutSession['fullBody']>>,
  ) => WorkoutSession | null
  completeGuidedSegment: (
    segmentId: Exclude<FullBodySegmentId, 'main'>,
    durationSeconds: number,
    status: 'completed' | 'partial',
    nextSegment?: FullBodySegmentId,
  ) => WorkoutSession | null
  onBack: () => void
  onFinishWorkout: () => void
  muted: boolean
}

export function FullBodyWorkoutFlow({
  session,
  mainExercises,
  currentMainExerciseIndex,
  onMainExerciseIndexChange,
  getExerciseLog,
  onUpdateSet,
  onPrefillSets,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
  onSkipExercise,
  onRemoveExercise,
  onReorderExercises,
  isExerciseLogged,
  isExerciseSkipped,
  setFullBodySegment,
  updateFullBodyGuidedState,
  completeGuidedSegment,
  onBack,
  onFinishWorkout,
  muted,
}: FullBodyWorkoutFlowProps) {
  const fullBody = session.fullBody!
  const currentSegment = reconcileFullBodySegment(session)

  useEffect(() => {
    if (fullBody.awaitingSegmentContinue) {
      updateFullBodyGuidedState({ awaitingSegmentContinue: null })
    }
  }, [fullBody.awaitingSegmentContinue, updateFullBodyGuidedState])

  useEffect(() => {
    const stored = session.fullBody?.currentSegment ?? 'warmup'
    if (stored !== currentSegment) {
      setFullBodySegment(currentSegment)
    }
  }, [currentSegment, session.fullBody?.currentSegment, setFullBodySegment])

  const handleGuidedComplete = useCallback(
    (
      segmentId: Exclude<FullBodySegmentId, 'main'>,
      durationSeconds: number,
      status: 'completed' | 'partial',
    ) => {
      const next = nextSegmentId(segmentId)
      if (!next) {
        completeGuidedSegment(segmentId, durationSeconds, status, segmentId)
        return
      }

      completeGuidedSegment(segmentId, durationSeconds, status, next)
    },
    [completeGuidedSegment],
  )

  const handleMainSegmentContinue = useCallback(() => {
    if (!isMainSegmentComplete(session)) return
    setFullBodySegment('core')
  }, [session, setFullBodySegment])

  const handleJumpToSegment = useCallback(
    (target: FullBodySegmentId) => {
      if (!canJumpToSegment(session, target)) return
      setFullBodySegment(target)
      if (target === 'main') {
        onMainExerciseIndexChange(0)
      }
    },
    [onMainExerciseIndexChange, session, setFullBodySegment],
  )

  const handleJumpToMainExercise = useCallback(
    (index: number) => {
      if (currentSegment !== 'main') {
        setFullBodySegment('main')
      }
      onMainExerciseIndexChange(index)
    },
    [currentSegment, onMainExerciseIndexChange, setFullBodySegment],
  )

  const overview = (
    <FullBodySessionOverview
      session={session}
      mainExercises={mainExercises}
      currentMainExerciseIndex={currentMainExerciseIndex}
      currentSegment={currentSegment}
      getExerciseLog={getExerciseLog}
      isExerciseLogged={isExerciseLogged}
      isExerciseSkipped={isExerciseSkipped}
      onJumpToMainExercise={handleJumpToMainExercise}
      onJumpToSegment={handleJumpToSegment}
    />
  )

  if (isGuidedSegmentId(currentSegment)) {
    const segmentDone = isGuidedSegmentDone(session, currentSegment)

    if (segmentDone && currentSegment === 'mobility') {
      return (
        <FullBodySessionLayout
          overview={overview}
          main={
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-green-500">
                Session complete
              </p>
              <h2 className="mt-2 text-3xl font-bold text-white">Full Body done</h2>
              <p className="mt-3 text-sm text-zinc-400">
                All segments logged. Finish to save your workout.
              </p>
              <button
                type="button"
                onClick={onFinishWorkout}
                className="mt-8 w-full rounded-xl bg-green-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-green-500"
              >
                Finish workout
              </button>
            </div>
          }
        />
      )
    }

    const segmentDef = getGuidedSegmentForId(currentSegment)

    return (
      <FullBodySessionLayout
        overview={overview}
        main={
          <GuidedSegmentView
            embedded
            muted={muted}
            segment={segmentDef}
            movementIndex={fullBody.guidedMovementIndex ?? 0}
            segmentStartedAt={fullBody.guidedSegmentStartedAt}
            onMovementIndexChange={(index) =>
              updateFullBodyGuidedState({ guidedMovementIndex: index })
            }
            onSegmentActiveStart={() =>
              updateFullBodyGuidedState({
                guidedSegmentStartedAt: new Date().toISOString(),
              })
            }
            onComplete={(duration, status) =>
              handleGuidedComplete(currentSegment, duration, status)
            }
            onBack={onBack}
          />
        }
      />
    )
  }

  const workout = getWorkoutById('full_body')
  if (!workout) return null

  return (
    <FullBodySessionLayout
      overview={overview}
      main={
      <WorkoutDeck
        workoutId="full_body"
        exercises={mainExercises}
        currentExerciseIndex={currentMainExerciseIndex}
        getExerciseLog={getExerciseLog}
        onUpdateSet={onUpdateSet}
        onPrefillSets={onPrefillSets}
        onCompleteSet={onCompleteSet}
        onAddSet={onAddSet}
        onDeleteSet={onDeleteSet}
        onSkipExercise={onSkipExercise}
        onRemoveExercise={onRemoveExercise}
        onReorderExercises={onReorderExercises}
        onJumpToExercise={onMainExerciseIndexChange}
        isExerciseLogged={isExerciseLogged}
        isExerciseSkipped={isExerciseSkipped}
        onPrevious={() => {
          for (let index = currentMainExerciseIndex - 1; index >= 0; index -= 1) {
            const id = mainExercises[index]?.id
            if (id && (isExerciseLogged(id) || isExerciseSkipped(id))) {
              onMainExerciseIndexChange(index)
              return
            }
          }
        }}
        onNext={() => {
          const exercise = mainExercises[currentMainExerciseIndex]
          if (!exercise) return
          const log = getExerciseLog(exercise.id)
          if (!canAdvanceFromExercise(log)) return
          onMainExerciseIndexChange(
            Math.min(mainExercises.length - 1, currentMainExerciseIndex + 1),
          )
        }}
        onBack={onBack}
        onFinish={handleMainSegmentContinue}
        lastExerciseActionLabel="Continue to Core"
        hideOverview
        skipFinishesWorkout={false}
      />
      }
    />
  )
}
