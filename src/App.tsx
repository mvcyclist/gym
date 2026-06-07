import { useCallback, useEffect, useState } from 'react'
import { AuthGate } from './components/AuthGate'
import { UserMenu } from './components/UserMenu'
import { useAuth } from './hooks/useAuth'
import { getWorkoutById } from './data/workouts'
import { MobilityView } from './components/MobilityView'
import { SaveProgressDialog } from './components/SaveProgressDialog'
import { WorkoutCompleteSummaryDialog } from './components/WorkoutCompleteSummaryDialog'
import { TimerBar } from './components/TimerBar'
import { TimerOnlyView } from './components/TimerOnlyView'
import { WorkoutDeck } from './components/WorkoutDeck'
import { WorkoutSelector } from './components/WorkoutSelector'
import { useAccurateTimer } from './hooks/useAccurateTimer'
import { useActivityHistory } from './hooks/useActivityHistory'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useWorkoutLog } from './hooks/useWorkoutLog'
import { getTomorrowWorkoutRecommendation } from './services/recommendationService'
import { getLastSevenDays } from './services/trainingLedgerService'
import { countCompletedSets } from './utils/sessionMetrics'
import { getRecommendationNavigation } from './utils/recommendationNavigation'
import { buildWorkoutSessionSummary } from './utils/workoutSummary'
import { findResumeExerciseIndex, findTodaysActiveSession } from './utils/workoutResume'
import { scrollToTop } from './utils/scrollToTop'
import type { WorkoutRecommendation } from './types/training'
import type { WorkoutCategory, WorkoutSession } from './types/workout'
import type { TodaySummary } from './utils/workoutSummary'

type AppScreen = 'home' | 'workout' | 'timer-only' | 'mobility'

function WorkoutApp() {
  const { configured, user, signOut, ledgerReady } = useAuth()
  const [screen, setScreen] = useState<AppScreen>('home')
  const [resumeChecked, setResumeChecked] = useState(false)
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<WorkoutCategory | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [saveProgressOpen, setSaveProgressOpen] = useState(false)
  const [workoutCompleteOpen, setWorkoutCompleteOpen] = useState(false)
  const [workoutCompleteData, setWorkoutCompleteData] = useState<{
    todaySummary: TodaySummary
    tomorrowRecommendation: WorkoutRecommendation
  } | null>(null)

  const {
    activityHistory,
    activeDaysCount,
    recommendationReady,
    recommendation,
    todayLogged,
    todaySummary,
    tomorrowRecommendation,
    updateDayActivities,
    saveBackfill,
    refresh,
  } = useActivityHistory()

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
    resumeSession,
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

  useEffect(() => {
    if (!ledgerReady || resumeChecked) return

    const active = findTodaysActiveSession()
    setResumeChecked(true)
    if (!active) return

    const resumed = resumeSession(active.id)
    if (!resumed) return

    setSelectedWorkoutType(resumed.workoutType)
    setCurrentExerciseIndex(findResumeExerciseIndex(resumed))
    setScreen('workout')
  }, [ledgerReady, resumeChecked, resumeSession])

  useEffect(() => {
    scrollToTop()
    const frame = requestAnimationFrame(scrollToTop)
    return () => cancelAnimationFrame(frame)
  }, [screen])

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
      scrollToTop()
      startSession(workoutId)
      setSelectedWorkoutType(workoutId)
      setCurrentExerciseIndex(0)
      setScreen('workout')
      reset()
    },
    [reset, startSession],
  )

  const handleSelectTimer = useCallback(() => {
    scrollToTop()
    setScreen('timer-only')
    reset()
  }, [reset])

  const handleSelectMobility = useCallback(() => {
    scrollToTop()
    setScreen('mobility')
  }, [])

  const startFromRecommendation = useCallback(
    (target: WorkoutRecommendation) => {
      const navigation = getRecommendationNavigation(target)
      if (navigation.action === 'workout' && navigation.workoutId) {
        handleSelectWorkout(navigation.workoutId)
        return
      }
      if (navigation.action === 'mobility') {
        handleSelectMobility()
      }
    },
    [handleSelectMobility, handleSelectWorkout],
  )

  const handleStartRecommendation = useCallback(() => {
    if (!recommendation) return
    startFromRecommendation(recommendation)
  }, [recommendation, startFromRecommendation])

  const handleStartTomorrowRecommendation = useCallback(() => {
    if (!tomorrowRecommendation) return
    startFromRecommendation(tomorrowRecommendation)
  }, [startFromRecommendation, tomorrowRecommendation])

  const showWorkoutCompleteSummary = useCallback((completed: WorkoutSession) => {
    refresh()
    const tomorrow = getTomorrowWorkoutRecommendation(getLastSevenDays())
    if (!tomorrow) return false

    setWorkoutCompleteData({
      todaySummary: buildWorkoutSessionSummary(completed),
      tomorrowRecommendation: tomorrow,
    })
    setWorkoutCompleteOpen(true)
    return true
  }, [refresh])

  const handleDismissWorkoutComplete = useCallback(() => {
    setWorkoutCompleteOpen(false)
    setWorkoutCompleteData(null)
    goHome()
  }, [goHome])

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
    void savePartialWorkout()
      .then((partial) => {
        if (!partial) return
        if (!showWorkoutCompleteSummary(partial)) {
          goHome()
        }
      })
      .catch((error) => console.error('[workout] failed to save progress', error))
  }, [goHome, savePartialWorkout, showWorkoutCompleteSummary])

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

    void finishWorkout()
      .then((completed) => {
        if (!completed) return
        if (!showWorkoutCompleteSummary(completed)) {
          goHome()
        }
      })
      .catch((error) => console.error('[workout] failed to finish workout', error))
  }, [
    currentExerciseIndex,
    finishWorkout,
    getExerciseLog,
    goHome,
    selectedWorkoutType,
    session,
    showWorkoutCompleteSummary,
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
      {configured && user && <UserMenu email={user.email} onSignOut={() => void signOut()} />}

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
            activeDaysCount={activeDaysCount}
            recommendationReady={recommendationReady}
            recommendation={recommendation}
            todayLogged={todayLogged}
            todaySummary={todaySummary}
            tomorrowRecommendation={tomorrowRecommendation}
            onUpdateDayActivities={updateDayActivities}
            onSaveBackfill={saveBackfill}
            onStartRecommendation={handleStartRecommendation}
            onStartTomorrowRecommendation={handleStartTomorrowRecommendation}
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

      {workoutCompleteData && (
        <WorkoutCompleteSummaryDialog
          open={workoutCompleteOpen}
          todaySummary={workoutCompleteData.todaySummary}
          tomorrowRecommendation={workoutCompleteData.tomorrowRecommendation}
          onDismiss={handleDismissWorkoutComplete}
          onStartTomorrow={() => {
            const target = workoutCompleteData.tomorrowRecommendation
            setWorkoutCompleteOpen(false)
            setWorkoutCompleteData(null)
            clearSession()
            reset()
            refresh()
            startFromRecommendation(target)
          }}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <AuthGate>
      <WorkoutApp />
    </AuthGate>
  )
}

export default App
