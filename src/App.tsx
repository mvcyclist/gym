import { useCallback, useState } from 'react'
import { getWorkoutById } from './data/workouts'
import { TimerBar } from './components/TimerBar'
import { WorkoutDeck } from './components/WorkoutDeck'
import { WorkoutSelector } from './components/WorkoutSelector'
import { useAccurateTimer } from './hooks/useAccurateTimer'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useWorkoutLog } from './hooks/useWorkoutLog'
import type { WorkoutCategory } from './types/workout'

function App() {
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<WorkoutCategory | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [muted, setMuted] = useState(false)

  const {
    session,
    startSession,
    updateSet,
    completeSet,
    addSet,
    deleteSet,
    getExerciseLog,
    completeSession,
    abandonSession,
    clearSession,
  } = useWorkoutLog()

  const {
    duration: timerDuration,
    remaining: timerRemaining,
    status: timerStatus,
    start,
    pause,
    reset,
    setDuration,
    startWithDuration,
    adjustRemaining,
  } = useAccurateTimer({ muted })

  const startRestForExercise = useCallback(
    (exerciseIndex: number) => {
      if (!selectedWorkoutType) return
      const workout = getWorkoutById(selectedWorkoutType)
      const exercise = workout?.exercises[exerciseIndex]
      if (!exercise) return
      startWithDuration(exercise.suggestedRestSeconds)
    },
    [selectedWorkoutType, startWithDuration],
  )

  const handleSelectWorkout = useCallback(
    (workoutId: WorkoutCategory) => {
      startSession(workoutId)
      setSelectedWorkoutType(workoutId)
      setCurrentExerciseIndex(0)
      reset()
    },
    [reset, startSession],
  )

  const handleBack = useCallback(() => {
    abandonSession()
    setSelectedWorkoutType(null)
    setCurrentExerciseIndex(0)
    clearSession()
    reset()
  }, [abandonSession, clearSession, reset])

  const handlePrevious = useCallback(() => {
    setCurrentExerciseIndex((index) => Math.max(0, index - 1))
  }, [])

  const handleNext = useCallback(() => {
    if (!selectedWorkoutType) return
    const workout = getWorkoutById(selectedWorkoutType)
    if (!workout) return

    const exercise = workout.exercises[currentExerciseIndex]
    const exerciseLog = getExerciseLog(exercise.id)
    const allSetsComplete = exerciseLog?.sets.every((set) => set.completed) ?? false
    if (!allSetsComplete) return

    const nextIndex = Math.min(workout.exercises.length - 1, currentExerciseIndex + 1)
    if (nextIndex === currentExerciseIndex) return

    startRestForExercise(nextIndex)
    setCurrentExerciseIndex(nextIndex)
  }, [currentExerciseIndex, getExerciseLog, selectedWorkoutType, startRestForExercise])

  const handleFinish = useCallback(() => {
    if (!selectedWorkoutType) return
    const workout = getWorkoutById(selectedWorkoutType)
    if (!workout) return

    const exercise = workout.exercises[currentExerciseIndex]
    const exerciseLog = getExerciseLog(exercise.id)
    const allSetsComplete = exerciseLog?.sets.every((set) => set.completed) ?? false
    if (!allSetsComplete) return

    completeSession()
    setSelectedWorkoutType(null)
    setCurrentExerciseIndex(0)
    clearSession()
    reset()
  }, [clearSession, completeSession, currentExerciseIndex, getExerciseLog, reset, selectedWorkoutType])

  const handleUpdateSet = useCallback(
    (
      exerciseId: string,
      setNumber: number,
      updates: Parameters<typeof updateSet>[2],
    ) => {
      updateSet(exerciseId, setNumber, updates)
    },
    [updateSet],
  )

  const handleCompleteSet = useCallback(
    (exerciseId: string, setNumber: number) => {
      if (!selectedWorkoutType) return
      const workout = getWorkoutById(selectedWorkoutType)
      const exercise = workout?.exercises.find((item) => item.id === exerciseId)
      if (!exercise) return

      completeSet(exerciseId, setNumber)
      startWithDuration(exercise.suggestedRestSeconds)
    },
    [completeSet, selectedWorkoutType, startWithDuration],
  )

  const handleAddSet = useCallback(
    (exerciseId: string) => {
      addSet(exerciseId)
    },
    [addSet],
  )

  const handleDeleteSet = useCallback(
    (exerciseId: string, setNumber: number) => {
      deleteSet(exerciseId, setNumber)
    },
    [deleteSet],
  )

  const handleToggleTimer = useCallback(() => {
    if (timerStatus === 'running') {
      pause()
    } else {
      start()
    }
  }, [pause, start, timerStatus])

  useKeyboardShortcuts({
    enabled: selectedWorkoutType !== null,
    onPrevious: handlePrevious,
    onNext: handleNext,
    onToggleTimer: handleToggleTimer,
    onResetTimer: reset,
  })

  return (
    <div className="flex min-h-full flex-col">
      <TimerBar
        remaining={timerRemaining}
        duration={timerDuration}
        status={timerStatus}
        muted={muted}
        onStart={start}
        onPause={pause}
        onReset={reset}
        onAdjust={adjustRemaining}
        onSetDuration={setDuration}
        onToggleMute={() => setMuted((value) => !value)}
      />

      <main className="flex-1">
        {selectedWorkoutType && session ? (
          <WorkoutDeck
            workoutId={selectedWorkoutType}
            currentExerciseIndex={currentExerciseIndex}
            getExerciseLog={getExerciseLog}
            onUpdateSet={handleUpdateSet}
            onCompleteSet={handleCompleteSet}
            onAddSet={handleAddSet}
            onDeleteSet={handleDeleteSet}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onBack={handleBack}
            onFinish={handleFinish}
          />
        ) : (
          <WorkoutSelector onSelect={handleSelectWorkout} />
        )}
      </main>
    </div>
  )
}

export default App
