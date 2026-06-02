import { useCallback, useState } from 'react'
import { getWorkoutById } from './data/workouts'
import { MobilityView } from './components/MobilityView'
import { SaveProgressDialog } from './components/SaveProgressDialog'
import { TimerBar } from './components/TimerBar'
import { TimerOnlyView } from './components/TimerOnlyView'
import { WorkoutDeck } from './components/WorkoutDeck'
import { WorkoutSelector } from './components/WorkoutSelector'
import { useAccurateTimer } from './hooks/useAccurateTimer'
import { useActivityHistory } from './hooks/useActivityHistory'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useWorkoutLog } from './hooks/useWorkoutLog'
import { countCompletedSets } from './utils/sessionMetrics'
import { getRecommendationNavigation } from './utils/recommendationNavigation'
import type { WorkoutCategory } from './types/workout'

type AppScreen = 'home' | 'workout' | 'timer-only' | 'mobility'

function App() {
  const [screen, setScreen] = useState<AppScreen>('home')
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<WorkoutCategory | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [saveProgressOpen, setSaveProgressOpen] = useState(false)

  const { activityHistory, recommendation, updateDayActivities, refresh } = useActivityHistory()

  const {
    session,
    startSession,
    updateSet,
    completeSet,
    addSet,
    deleteSet,
    getExerciseLog,
    finishWorkout,
    savePartialWorkout,
    discardActiveWorkout,
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

  const showTimer = screen === 'workout' || screen === 'timer-only'
  const completedSetsInSession = session ? countCompletedSets(session) : 0

  const goHome = useCallback(() => {
    setScreen('home')
    setSelectedWorkoutType(null)
    setCurrentExerciseIndex(0)
    setSaveProgressOpen(false)
    clearSession()
    reset()
    refresh()
  }, [clearSession, refresh, reset])

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
      setScreen('workout')
      reset()
    },
    [reset, startSession],
  )

  const handleSelectTimer = useCallback(() => {
    setScreen('timer-only')
    reset()
  }, [reset])

  const handleSelectMobility = useCallback(() => {
    setScreen('mobility')
  }, [])

  const handleStartRecommendation = useCallback(() => {
    const navigation = getRecommendationNavigation(recommendation)
    if (navigation.action === 'workout' && navigation.workoutId) {
      handleSelectWorkout(navigation.workoutId)
      return
    }
    if (navigation.action === 'mobility') {
      handleSelectMobility()
    }
  }, [handleSelectMobility, handleSelectWorkout, recommendation])

  const handleBackFromWorkout = useCallback(() => {
    if (!session) return

    if (completedSetsInSession === 0) {
      discardActiveWorkout()
      goHome()
      return
    }

    setSaveProgressOpen(true)
  }, [completedSetsInSession, discardActiveWorkout, goHome, session])

  const handleSaveProgress = useCallback(() => {
    savePartialWorkout()
    goHome()
  }, [goHome, savePartialWorkout])

  const handleDiscardProgress = useCallback(() => {
    discardActiveWorkout()
    goHome()
  }, [discardActiveWorkout, goHome])

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
    if (!selectedWorkoutType || !session) return
    const workout = getWorkoutById(selectedWorkoutType)
    if (!workout) return

    const exercise = workout.exercises[currentExerciseIndex]
    const exerciseLog = getExerciseLog(exercise.id)
    const allSetsComplete = exerciseLog?.sets.every((set) => set.completed) ?? false
    if (!allSetsComplete) return

    if (countCompletedSets(session) === 0) return

    finishWorkout()
    goHome()
  }, [
    currentExerciseIndex,
    finishWorkout,
    getExerciseLog,
    goHome,
    selectedWorkoutType,
    session,
  ])

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
    enabled: screen === 'workout' || screen === 'timer-only',
    onPrevious: screen === 'workout' ? handlePrevious : undefined,
    onNext: screen === 'workout' ? handleNext : undefined,
    onToggleTimer: handleToggleTimer,
    onResetTimer: reset,
  })

  return (
    <div className="flex min-h-full flex-col">
      {showTimer && (
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
      )}

      <main className="flex-1">
        {screen === 'home' && (
          <WorkoutSelector
            activityHistory={activityHistory}
            recommendation={recommendation}
            onUpdateDayActivities={updateDayActivities}
            onStartRecommendation={handleStartRecommendation}
            onSelectWorkout={handleSelectWorkout}
            onSelectTimer={handleSelectTimer}
            onSelectMobility={handleSelectMobility}
          />
        )}

        {screen === 'workout' && selectedWorkoutType && session && (
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
            onBack={handleBackFromWorkout}
            onFinish={handleFinish}
          />
        )}

        {screen === 'timer-only' && <TimerOnlyView onBack={goHome} />}

        {screen === 'mobility' && <MobilityView onBack={goHome} />}
      </main>

      <SaveProgressDialog
        open={saveProgressOpen}
        completedSets={completedSetsInSession}
        onSave={handleSaveProgress}
        onDiscard={handleDiscardProgress}
        onCancel={() => setSaveProgressOpen(false)}
      />
    </div>
  )
}

export default App
