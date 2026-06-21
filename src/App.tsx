import { useCallback, useEffect, useState } from 'react'
import { AuthGate } from './components/AuthGate'
import { UserMenu } from './components/UserMenu'
import { useAuth } from './hooks/useAuth'
import { getWorkoutById } from './data/workouts'
import { MobilityView } from './components/MobilityView'
import { LeaveWorkoutDialog } from './components/LeaveWorkoutDialog'
import { PriorDayDraftDialog } from './components/PriorDayDraftDialog'
import { SaveProgressDialog } from './components/SaveProgressDialog'
import { WorkoutCompleteSummaryDialog } from './components/WorkoutCompleteSummaryDialog'
import { TimerBar } from './components/TimerBar'
import { TimerOnlyView } from './components/TimerOnlyView'
import { WorkoutDeck } from './components/WorkoutDeck'
import { WorkoutElapsedBar } from './components/WorkoutElapsedBar'
import { WorkoutSelector } from './components/WorkoutSelector'
import { WorkoutStartView } from './components/WorkoutStartView'
import { CardioLogScreen } from './components/CardioLogScreen'
import { useAccurateTimer } from './hooks/useAccurateTimer'
import { useActivityHistory } from './hooks/useActivityHistory'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useWorkoutElapsedTimer } from './hooks/useWorkoutElapsedTimer'
import { useWorkoutLog } from './hooks/useWorkoutLog'
import { getTomorrowWorkoutRecommendation } from './services/recommendationService'
import { appendManualActivity, getLastSevenDays } from './services/trainingLedgerService'
import {
  getProgressionTarget,
  getDefaultProfile,
  normalizeExerciseName,
  countQualifyingSets,
} from './services/progressiveOverloadEngine'
import {
  loadExerciseHistory,
  loadExerciseProfile,
  appendExerciseHistory,
} from './services/exerciseProgressionStore'
import {
  discardDraft,
  findPriorDayDraft,
  formatDraftWorkoutDate,
  promoteDraftToPartial,
} from './services/workoutDraftService'
import { toDateString } from './utils/activityHistory'
import { countCompletedSets } from './utils/sessionMetrics'
import { getRecommendationNavigation } from './utils/recommendationNavigation'
import { buildWorkoutSessionSummary } from './utils/workoutSummary'
import { isWorkoutInProgress } from './utils/workoutTimer'
import { findResumeExerciseIndex, findTodaysResumableSession } from './utils/workoutResume'
import { scrollToTop, scrollToTopAfterLayout } from './utils/scrollToTop'
import type { WorkoutRecommendation, WorkoutType } from './types/training'
import type { WorkoutCategory, WorkoutSession } from './types/workout'
import type { TodaySummary } from './utils/workoutSummary'

type AppScreen = 'home' | 'workout' | 'timer-only' | 'mobility' | 'cardio-log'

function WorkoutApp() {
  const { configured, user, signOut, ledgerReady } = useAuth()
  const [screen, setScreen] = useState<AppScreen>('home')
  const [selectedCardioType, setSelectedCardioType] = useState<WorkoutType | null>(null)
  const [resumeChecked, setResumeChecked] = useState(false)
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<WorkoutCategory | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [leaveWorkoutOpen, setLeaveWorkoutOpen] = useState(false)
  const [saveProgressOpen, setSaveProgressOpen] = useState(false)
  const [priorDayDraftOpen, setPriorDayDraftOpen] = useState(false)
  const [priorDayDraftSession, setPriorDayDraftSession] = useState<WorkoutSession | null>(null)
  const [pendingWorkoutId, setPendingWorkoutId] = useState<WorkoutCategory | null>(null)
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
    weeklyPlan,
    updateDayActivities,
    deleteWorkoutSession,
    saveBackfill,
    refresh,
  } = useActivityHistory()

  const {
    session,
    startSession,
    updateSet,
    prefillExerciseSets,
    completeSet,
    addSet,
    deleteSet,
    skipExercise,
    getExerciseLog,
    isExerciseLogged,
    finishWorkout,
    savePartialWorkout,
    pauseWorkout,
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

  const workoutStarted = isWorkoutInProgress(session)
  const workoutElapsedSeconds = useWorkoutElapsedTimer(session)
  const showWorkoutTimers = screen === 'workout' && workoutStarted
  const showRestTimerOnly = screen === 'timer-only'
  const completedSetsInSession = session ? countCompletedSets(session) : 0

  useEffect(() => {
    scrollToTopAfterLayout()
  }, [screen, workoutStarted])

  const goHome = useCallback(() => {
    setScreen('home')
    setSelectedWorkoutType(null)
    setCurrentExerciseIndex(0)
    setLeaveWorkoutOpen(false)
    setSaveProgressOpen(false)
    setPriorDayDraftOpen(false)
    setPriorDayDraftSession(null)
    setPendingWorkoutId(null)
    clearSession()
    reset()
    refresh()
  }, [clearSession, refresh, reset])

  const openWorkoutPreview = useCallback(
    (workoutId: WorkoutCategory) => {
      scrollToTop()
      clearSession()
      setSelectedWorkoutType(workoutId)
      setCurrentExerciseIndex(0)
      setScreen('workout')
      reset()
    },
    [clearSession, reset],
  )

  const resumeWorkoutScreen = useCallback(
    (resumed: WorkoutSession) => {
      scrollToTop()
      setSelectedWorkoutType(resumed.workoutType)
      const workout = getWorkoutById(resumed.workoutType)
      const templateExerciseIds = workout?.exercises.map((item) => item.id) ?? []
      setCurrentExerciseIndex(findResumeExerciseIndex(resumed, templateExerciseIds))
      setScreen('workout')
      reset()
    },
    [reset],
  )

  useEffect(() => {
    if (!ledgerReady || resumeChecked) return

    const priorDay = findPriorDayDraft()
    if (priorDay) {
      setPriorDayDraftSession(priorDay)
      setPriorDayDraftOpen(true)
      setResumeChecked(true)
      return
    }

    const active = findTodaysResumableSession()
    setResumeChecked(true)
    if (!active) return

    const resumed = resumeSession(active.id)
    if (!resumed) return

    resumeWorkoutScreen(resumed)
  }, [ledgerReady, resumeChecked, resumeSession, resumeWorkoutScreen])

  const handlePriorDaySave = useCallback(() => {
    if (!priorDayDraftSession) return

    const calendarDate = toDateString(new Date(priorDayDraftSession.startedAt))
    void promoteDraftToPartial(priorDayDraftSession, { calendarDate })
      .then(() => {
        setPriorDayDraftOpen(false)
        setPriorDayDraftSession(null)
        refresh()
      })
      .catch((error) => console.error('[workout] failed to save prior-day draft', error))
  }, [priorDayDraftSession, refresh])

  const handlePriorDayReview = useCallback(() => {
    if (!priorDayDraftSession) return

    setPriorDayDraftOpen(false)
    const resumed = resumeSession(priorDayDraftSession.id, { activate: true })
    setPriorDayDraftSession(null)
    if (resumed) {
      resumeWorkoutScreen(resumed)
    }
  }, [priorDayDraftSession, resumeSession, resumeWorkoutScreen])

  const handlePriorDayDiscard = useCallback(() => {
    discardDraft()
    setPriorDayDraftOpen(false)
    setPriorDayDraftSession(null)
  }, [])

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
      const existing = findTodaysResumableSession()

      if (existing && existing.workoutType !== workoutId) {
        resumeSession(existing.id, { activate: false })
        setPendingWorkoutId(workoutId)
        setLeaveWorkoutOpen(true)
        return
      }

      if (existing && existing.workoutType === workoutId) {
        const resumed = resumeSession(existing.id)
        if (resumed) resumeWorkoutScreen(resumed)
        return
      }

      openWorkoutPreview(workoutId)
    },
    [openWorkoutPreview, resumeSession, resumeWorkoutScreen],
  )

  const handleStartWorkout = useCallback(() => {
    if (!selectedWorkoutType) return
    startSession(selectedWorkoutType)
    reset()
    scrollToTopAfterLayout()
  }, [reset, selectedWorkoutType, startSession])

  const handleSelectTimer = useCallback(() => {
    scrollToTop()
    setScreen('timer-only')
    reset()
  }, [reset])

  const handleSelectMobility = useCallback(() => {
    scrollToTop()
    setScreen('mobility')
  }, [])

  const handleSelectCardio = useCallback((type: WorkoutType) => {
    scrollToTop()
    setSelectedCardioType(type)
    setScreen('cardio-log')
  }, [])

  const startFromRecommendation = useCallback(
    (type: WorkoutType) => {
      const navigation = getRecommendationNavigation(type)
      if (navigation.action === 'workout' && navigation.workoutId) {
        handleSelectWorkout(navigation.workoutId)
        return
      }
      if (navigation.action === 'cardio' && navigation.cardioType) {
        handleSelectCardio(navigation.cardioType)
        return
      }
      if (navigation.action === 'mobility') {
        handleSelectMobility()
      }
    },
    [handleSelectCardio, handleSelectMobility, handleSelectWorkout],
  )

  const handleStartRecommendation = useCallback(() => {
    if (!recommendation) return
    startFromRecommendation(recommendation.primary.type)
  }, [recommendation, startFromRecommendation])

  const handleStartTomorrowRecommendation = useCallback(() => {
    if (!tomorrowRecommendation) return
    startFromRecommendation(tomorrowRecommendation.workoutType)
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

  const navigateAfterLeave = useCallback(() => {
    const nextWorkout = pendingWorkoutId
    setPendingWorkoutId(null)
    setLeaveWorkoutOpen(false)
    clearSession()
    reset()

    if (nextWorkout) {
      openWorkoutPreview(nextWorkout)
      return
    }

    setScreen('home')
    setSelectedWorkoutType(null)
    setCurrentExerciseIndex(0)
    refresh()
  }, [clearSession, openWorkoutPreview, pendingWorkoutId, refresh, reset])

  const handleBackFromWorkoutPreview = useCallback(() => {
    goHome()
  }, [goHome])

  const handleBackFromWorkout = useCallback(() => {
    if (!workoutStarted) {
      goHome()
      return
    }

    setLeaveWorkoutOpen(true)
  }, [goHome, workoutStarted])

  const handlePauseAndResumeLater = useCallback(() => {
    pauseWorkout()
    setLeaveWorkoutOpen(false)
    setPendingWorkoutId(null)
    clearSession()
    setScreen('home')
    setSelectedWorkoutType(null)
    setCurrentExerciseIndex(0)
    reset()
  }, [clearSession, pauseWorkout, reset])

  const navigateAfterPartialSave = useCallback(
    (partial: WorkoutSession) => {
      const nextWorkout = pendingWorkoutId
      setPendingWorkoutId(null)
      setLeaveWorkoutOpen(false)
      setSaveProgressOpen(false)
      clearSession()
      reset()

      if (nextWorkout) {
        openWorkoutPreview(nextWorkout)
        return
      }

      if (!showWorkoutCompleteSummary(partial)) {
        setScreen('home')
        setSelectedWorkoutType(null)
        setCurrentExerciseIndex(0)
        refresh()
      }
    },
    [
      clearSession,
      openWorkoutPreview,
      pendingWorkoutId,
      refresh,
      reset,
      showWorkoutCompleteSummary,
    ],
  )

  const handleEndWorkout = useCallback(() => {
    if (completedSetsInSession > 0) {
      setLeaveWorkoutOpen(false)
      setSaveProgressOpen(true)
      return
    }

    discardActiveWorkout()
    navigateAfterLeave()
  }, [completedSetsInSession, discardActiveWorkout, navigateAfterLeave])

  const handleSaveProgress = useCallback(() => {
    void savePartialWorkout()
      .then((partial) => {
        if (!partial) return
        navigateAfterPartialSave(partial)
      })
      .catch((error) => console.error('[workout] failed to save progress', error))
  }, [navigateAfterPartialSave, savePartialWorkout])

  const handleDiscardProgress = useCallback(() => {
    discardActiveWorkout()
    setSaveProgressOpen(false)
    navigateAfterLeave()
  }, [discardActiveWorkout, navigateAfterLeave])

  const handleCancelSaveProgress = useCallback(() => {
    setSaveProgressOpen(false)
  }, [])

  const handlePrevious = useCallback(() => {
    if (!selectedWorkoutType) return
    const workout = getWorkoutById(selectedWorkoutType)
    if (!workout) return

    for (let index = currentExerciseIndex - 1; index >= 0; index -= 1) {
      if (isExerciseLogged(workout.exercises[index].id)) {
        setCurrentExerciseIndex(index)
        return
      }
    }
  }, [currentExerciseIndex, isExerciseLogged, selectedWorkoutType])

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

    // Write exercise progression history for each completed exercise
    const now = Date.now()
    const todayDate = new Date().toISOString().slice(0, 10)
    for (const log of session.exercises) {
      const completedSets = log.sets.filter((s) => s.completed)
      if (completedSets.length === 0) continue
      const profile = loadExerciseProfile(log.exerciseName) ?? getDefaultProfile(log.exerciseName)
      const history = loadExerciseHistory(log.exerciseName)
      const target = getProgressionTarget(history, profile)
      const engineSets = completedSets
        .map((s) => {
          const w = parseFloat(s.weight)
          const r = parseInt(s.reps, 10)
          if (isNaN(w) || isNaN(r)) return null
          return { reps: r, weightLbs: w, completed: true }
        })
        .filter((s): s is { reps: number; weightLbs: number; completed: boolean } => s !== null)
      if (engineSets.length === 0) continue
      const topWeight = Math.max(...engineSets.map((s) => s.weightLbs))
      appendExerciseHistory({
        exerciseName: normalizeExerciseName(log.exerciseName),
        date: todayDate,
        timestamp: now,
        weight: topWeight,
        sets: engineSets,
        repRangeBottom: target.targetRepsBottom,
        repRangeTop: target.targetRepsTop,
        qualifyingSets: countQualifyingSets(engineSets, target.targetRepsBottom),
      })
    }

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

  const handleSkipExercise = useCallback(
    (exerciseId: string) => {
      if (!selectedWorkoutType) return
      const workout = getWorkoutById(selectedWorkoutType)
      if (!workout) return

      const updated = skipExercise(exerciseId)
      if (!updated) return

      const isLast = currentExerciseIndex >= workout.exercises.length - 1

      if (isLast) {
        if (countCompletedSets(updated) === 0) {
          discardActiveWorkout()
          goHome()
          return
        }

        void finishWorkout(updated)
          .then((completed) => {
            if (!completed) return
            if (!showWorkoutCompleteSummary(completed)) {
              goHome()
            }
          })
          .catch((error) => console.error('[workout] failed to finish workout', error))
        return
      }

      setCurrentExerciseIndex((index) => Math.min(workout.exercises.length - 1, index + 1))
    },
    [
      currentExerciseIndex,
      discardActiveWorkout,
      finishWorkout,
      goHome,
      selectedWorkoutType,
      showWorkoutCompleteSummary,
      skipExercise,
    ],
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

      {showWorkoutTimers && (
        <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm">
          <WorkoutElapsedBar elapsedSeconds={workoutElapsedSeconds} />
          <TimerBar
            remaining={timerRemaining}
            duration={timerDuration}
            status={timerStatus}
            muted={muted}
            embedded
            onStart={start}
            onPause={pause}
            onReset={reset}
            onAdjust={adjustRemaining}
            onSetDuration={setDuration}
            onToggleMute={() => setMuted((value) => !value)}
          />
        </div>
      )}

      {showRestTimerOnly && (
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
            weeklyPlan={weeklyPlan}
            onUpdateDayActivities={updateDayActivities}
            onDeleteWorkoutSession={deleteWorkoutSession}
            onSaveBackfill={saveBackfill}
            onStartRecommendation={handleStartRecommendation}
            onStartTomorrowRecommendation={handleStartTomorrowRecommendation}
            onSelectWorkout={handleSelectWorkout}
            onSelectCardio={handleSelectCardio}
            onSelectTimer={handleSelectTimer}
            onSelectMobility={handleSelectMobility}
          />
        )}

        {screen === 'workout' && selectedWorkoutType && workoutStarted && (
          <WorkoutDeck
            workoutId={selectedWorkoutType}
            currentExerciseIndex={currentExerciseIndex}
            getExerciseLog={getExerciseLog}
            onUpdateSet={handleUpdateSet}
            onPrefillSets={(exerciseId, weight, reps) => prefillExerciseSets(exerciseId, weight, reps)}
            onCompleteSet={handleCompleteSet}
            onAddSet={handleAddSet}
            onDeleteSet={handleDeleteSet}
            onSkipExercise={handleSkipExercise}
            isExerciseLogged={isExerciseLogged}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onBack={handleBackFromWorkout}
            onFinish={handleFinish}
          />
        )}

        {screen === 'workout' && selectedWorkoutType && !workoutStarted && (
          <WorkoutStartView
            workoutId={selectedWorkoutType}
            onStart={handleStartWorkout}
            onBack={handleBackFromWorkoutPreview}
          />
        )}

        {screen === 'timer-only' && <TimerOnlyView onBack={goHome} />}

        {screen === 'mobility' && <MobilityView onBack={goHome} />}

        {screen === 'cardio-log' && selectedCardioType && (
          <CardioLogScreen
            type={selectedCardioType}
            history={activityHistory}
            onBack={goHome}
            onLog={({ type, durationMinutes, intensity, distanceMeters, distanceMiles }) => {
              const date = toDateString(new Date())
              appendManualActivity(date, {
                id: `${date}-${type}-${crypto.randomUUID().slice(0, 8)}`,
                date,
                type,
                intensity,
                durationMinutes,
                distanceMeters,
                distanceMiles,
                source: 'manual',
              })
              refresh()
              goHome()
            }}
          />
        )}
      </main>

      <LeaveWorkoutDialog
        open={leaveWorkoutOpen}
        completedSets={completedSetsInSession}
        onPauseAndResume={handlePauseAndResumeLater}
        onEndWorkout={handleEndWorkout}
        onCancel={() => {
          setLeaveWorkoutOpen(false)
          setPendingWorkoutId(null)
        }}
      />

      <SaveProgressDialog
        open={saveProgressOpen}
        completedSets={completedSetsInSession}
        onSave={handleSaveProgress}
        onDiscard={handleDiscardProgress}
        onCancel={handleCancelSaveProgress}
      />

      {priorDayDraftSession && (
        <PriorDayDraftDialog
          open={priorDayDraftOpen}
          workoutDateLabel={formatDraftWorkoutDate(priorDayDraftSession)}
          workoutTitle={
            getWorkoutById(priorDayDraftSession.workoutType)?.title ??
            priorDayDraftSession.workoutType
          }
          completedSets={countCompletedSets(priorDayDraftSession)}
          onSave={handlePriorDaySave}
          onReview={handlePriorDayReview}
          onDiscard={handlePriorDayDiscard}
        />
      )}

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
            startFromRecommendation(target.workoutType)
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
