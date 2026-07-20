import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthGate } from './components/AuthGate'
import { AiCoachLayout } from './components/AiCoachLayout'
import { HomeScreen } from './components/HomeScreen'
import { useAuth } from './hooks/useAuth'
import { useUserProfileContext } from './contexts/UserProfileContext'
import { getWorkoutById } from './data/workouts'
import { getCatalogExerciseById, getDefaultRestSeconds } from './data/exerciseCatalog'
import { MobilityView } from './components/MobilityView'
import { CoreView } from './components/CoreView'
import { LeaveWorkoutDialog } from './components/LeaveWorkoutDialog'
import { PriorDayDraftDialog } from './components/PriorDayDraftDialog'
import { SaveProgressDialog } from './components/SaveProgressDialog'
import { WorkoutCompleteSummaryDialog } from './components/WorkoutCompleteSummaryDialog'
import { TimerBar } from './components/TimerBar'
import { TimerOnlyView } from './components/TimerOnlyView'
import { WorkoutDeck } from './components/WorkoutDeck'
import { FullBodyWorkoutFlow } from './components/FullBodyWorkoutFlow'
import { WorkoutStartView } from './components/WorkoutStartView'
import { CardioLogScreen } from './components/CardioLogScreen'
import { useAccurateTimer } from './hooks/useAccurateTimer'
import { useActivityHistory } from './hooks/useActivityHistory'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useWorkoutElapsedTimer } from './hooks/useWorkoutElapsedTimer'
import { useWorkoutLog } from './hooks/useWorkoutLog'
import { getTomorrowWorkoutRecommendation } from './services/recommendationService'
import { appendManualActivity } from './services/trainingLedgerService'
import { getLastSevenDays } from './services/historyQueryService'
import {
  discardDraft,
  findPriorDayDraft,
  formatDraftWorkoutDate,
  promoteDraftToPartial,
} from './services/workoutDraftService'
import { toDateString } from './utils/activityHistory'
import { countCompletedSets, canAdvanceFromExercise } from './utils/sessionMetrics'
import { getRecommendationNavigation } from './utils/recommendationNavigation'
import { buildWorkoutSessionSummary } from './utils/workoutSummary'
import { isWorkoutInProgress } from './utils/workoutTimer'
import { findResumeExerciseIndex, findTodaysResumableSession } from './utils/workoutResume'
import { buildDisplayExercisesForSession, sessionExerciseOrder } from './utils/sessionExercises'
import {
  findMainLiftResumeIndex,
  hasWorkoutProgress,
  isStructuredFullBodySession,
} from './utils/fullBodySessionState'
import { scrollToTop, scrollToTopAfterLayout } from './utils/scrollToTop'
import type { WorkoutRecommendation, WorkoutType } from './types/training'
import type { Exercise, WorkoutCategory, WorkoutSession } from './types/workout'
import type { TodaySummary } from './utils/workoutSummary'

type AppScreen = 'home' | 'workout' | 'timer-only' | 'mobility' | 'core-view' | 'cardio-log'

function WorkoutApp() {
  const { user, signOut, ledgerReady } = useAuth()
  const { refresh: refreshProfile } = useUserProfileContext()
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
  const [pendingRecommendedExercises, setPendingRecommendedExercises] = useState<Exercise[] | null>(null)
  const [previewExercises, setPreviewExercises] = useState<Exercise[] | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string | null>(null)
  const [previewDescription, setPreviewDescription] = useState<string | null>(null)
  const [workoutCompleteOpen, setWorkoutCompleteOpen] = useState(false)
  const [workoutCompleteData, setWorkoutCompleteData] = useState<{
    todaySummary: TodaySummary
    tomorrowRecommendation: WorkoutRecommendation
  } | null>(null)

  const {
    activityHistory,
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
    isExerciseSkipped,
    reorderExercises,
    removeExerciseFromSession,
    getExerciseLog,
    isExerciseLogged,
    finishWorkout,
    savePartialWorkout,
    pauseWorkout,
    discardActiveWorkout,
    clearSession,
    resumeSession,
    setFullBodySegment,
    updateFullBodyGuidedState,
    completeGuidedSegment,
    flushActiveGuidedSegment,
  } = useWorkoutLog()

  const {
    duration: timerDuration,
    remaining: timerRemaining,
    status: timerStatus,
    start,
    pause,
    reset,
    setDuration,
    setDurationPreset,
    startWithDuration,
    adjustRemaining,
  } = useAccurateTimer({ muted })

  const workoutStarted = isWorkoutInProgress(session)
  const workoutElapsedSeconds = useWorkoutElapsedTimer(session)
  const showWorkoutTimers = screen === 'workout' && workoutStarted
  const showRestTimerOnly = screen === 'timer-only'
  const completedSetsInSession = session ? countCompletedSets(session) : 0

  const effectiveExercises = useMemo(() => {
    if (!selectedWorkoutType) return []

    if (session && session.workoutType === selectedWorkoutType) {
      return buildDisplayExercisesForSession(session)
    }

    if (previewExercises) return previewExercises

    const workout = getWorkoutById(selectedWorkoutType)
    if (!workout) return []
    return workout.exercises
  }, [selectedWorkoutType, session, previewExercises])

  useEffect(() => {
    scrollToTopAfterLayout()
  }, [screen, workoutStarted])

  useEffect(() => {
    if (screen === 'workout' && !selectedWorkoutType) {
      setScreen('home')
    }
  }, [screen, selectedWorkoutType])

  const goHome = useCallback(() => {
    setScreen('home')
    setSelectedWorkoutType(null)
    setCurrentExerciseIndex(0)
    setLeaveWorkoutOpen(false)
    setSaveProgressOpen(false)
    setPriorDayDraftOpen(false)
    setPriorDayDraftSession(null)
    setPendingWorkoutId(null)
    setPendingRecommendedExercises(null)
    setPreviewExercises(null)
    setPreviewTitle(null)
    setPreviewDescription(null)
    clearSession()
    reset()
    refresh()
  }, [clearSession, refresh, reset])

  const openWorkoutPreview = useCallback(
    (workoutId: WorkoutCategory) => {
      scrollToTop()
      clearSession()
      setPreviewExercises(null)
      setPreviewTitle(null)
      setPreviewDescription(null)
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
      if (isStructuredFullBodySession(resumed) && resumed.fullBody?.currentSegment !== 'main') {
        setCurrentExerciseIndex(0)
      } else if (isStructuredFullBodySession(resumed)) {
        setCurrentExerciseIndex(findMainLiftResumeIndex(resumed))
      } else {
        setCurrentExerciseIndex(
          findResumeExerciseIndex(resumed, sessionExerciseOrder(resumed)),
        )
      }
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


  useEffect(() => {
    if (screen !== 'workout') return
    const exercise = effectiveExercises[currentExerciseIndex]
    if (!exercise) return
    const catalog = getCatalogExerciseById(exercise.catalogExerciseId)
    const seconds = catalog ? getDefaultRestSeconds(catalog) : exercise.suggestedRestSeconds
    setDurationPreset(seconds)
  }, [screen, effectiveExercises, currentExerciseIndex, setDurationPreset])

  const handleSelectWorkout = useCallback(
    (workoutId: WorkoutCategory) => {
      const existing = findTodaysResumableSession()

      if (existing && existing.workoutType !== workoutId) {
        resumeSession(existing.id, { activate: false })
        setPendingWorkoutId(workoutId)
        setPendingRecommendedExercises(null)
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

  const handleStartWorkout = useCallback((customOrder?: string[], exercises?: Exercise[]) => {
    if (!selectedWorkoutType) return
    if (exercises) {
      startSession(selectedWorkoutType, customOrder ?? exercises.map((e) => e.id), exercises)
    } else {
      startSession(selectedWorkoutType, customOrder)
    }
    setPreviewExercises(null)
    setPreviewTitle(null)
    setPreviewDescription(null)
    reset()
    scrollToTopAfterLayout()
  }, [reset, selectedWorkoutType, startSession])

  const beginRecommendedSession = useCallback(
    (workoutId: WorkoutCategory, exercises: Exercise[]) => {
      scrollToTop()
      clearSession()
      setSelectedWorkoutType(workoutId)
      setCurrentExerciseIndex(0)
      startSession(workoutId, exercises.map((exercise) => exercise.id), exercises)
      setPendingRecommendedExercises(null)
      setScreen('workout')
      reset()
      scrollToTopAfterLayout()
    },
    [clearSession, reset, startSession],
  )

  const handleStartRecommendedWorkout = useCallback(
    (workoutId: WorkoutCategory, exercises: Exercise[]) => {
      const existing = findTodaysResumableSession()
      if (existing) {
        resumeSession(existing.id, { activate: false })
        setPendingWorkoutId(workoutId)
        setPendingRecommendedExercises(exercises)
        setLeaveWorkoutOpen(true)
        return
      }

      beginRecommendedSession(workoutId, exercises)
    },
    [beginRecommendedSession, resumeSession],
  )

  const handleSelectMobility = useCallback(() => {
    scrollToTop()
    setScreen('mobility')
  }, [])

  const handleSelectCore = useCallback(() => {
    scrollToTop()
    setScreen('core-view')
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
        return
      }
      if (navigation.action === 'core') {
        handleSelectCore()
      }
    },
    [handleSelectCardio, handleSelectCore, handleSelectMobility, handleSelectWorkout],
  )

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
    const nextRecommended = pendingRecommendedExercises
    setPendingWorkoutId(null)
    setPendingRecommendedExercises(null)
    setLeaveWorkoutOpen(false)
    clearSession()
    reset()

    if (nextWorkout && nextRecommended && nextRecommended.length > 0) {
      beginRecommendedSession(nextWorkout, nextRecommended)
      return
    }

    if (nextWorkout) {
      openWorkoutPreview(nextWorkout)
      return
    }

    setScreen('home')
    setSelectedWorkoutType(null)
    setCurrentExerciseIndex(0)
    refresh()
  }, [
    beginRecommendedSession,
    clearSession,
    openWorkoutPreview,
    pendingRecommendedExercises,
    pendingWorkoutId,
    refresh,
    reset,
  ])

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
    setPendingRecommendedExercises(null)
    clearSession()
    setScreen('home')
    setSelectedWorkoutType(null)
    setCurrentExerciseIndex(0)
    reset()
  }, [clearSession, pauseWorkout, reset])

  const navigateAfterPartialSave = useCallback(
    (partial: WorkoutSession) => {
      const nextWorkout = pendingWorkoutId
      const nextRecommended = pendingRecommendedExercises
      setPendingWorkoutId(null)
      setPendingRecommendedExercises(null)
      setLeaveWorkoutOpen(false)
      setSaveProgressOpen(false)
      clearSession()
      reset()

      if (nextWorkout && nextRecommended && nextRecommended.length > 0) {
        beginRecommendedSession(nextWorkout, nextRecommended)
        return
      }

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
      beginRecommendedSession,
      clearSession,
      openWorkoutPreview,
      pendingRecommendedExercises,
      pendingWorkoutId,
      refresh,
      reset,
      showWorkoutCompleteSummary,
    ],
  )

  const handleEndWorkout = useCallback(() => {
    const updated = flushActiveGuidedSegment()
    const active = updated ?? session
    const hasProgress = active
      ? isStructuredFullBodySession(active)
        ? hasWorkoutProgress(active)
        : countCompletedSets(active) > 0
      : false

    if (hasProgress) {
      setLeaveWorkoutOpen(false)
      setSaveProgressOpen(true)
      return
    }

    discardActiveWorkout()
    navigateAfterLeave()
  }, [
    discardActiveWorkout,
    flushActiveGuidedSegment,
    navigateAfterLeave,
    session,
  ])

  const handleSaveProgress = useCallback(() => {
    flushActiveGuidedSegment()
    void savePartialWorkout()
      .then((partial) => {
        if (!partial) return
        navigateAfterPartialSave(partial)
      })
      .catch((error) => console.error('[workout] failed to save progress', error))
  }, [flushActiveGuidedSegment, navigateAfterPartialSave, savePartialWorkout])

  const handleDiscardProgress = useCallback(() => {
    discardActiveWorkout()
    setSaveProgressOpen(false)
    navigateAfterLeave()
  }, [discardActiveWorkout, navigateAfterLeave])

  const handleCancelSaveProgress = useCallback(() => {
    setSaveProgressOpen(false)
  }, [])

  const handleFinishFullBodyWorkout = useCallback(() => {
    if (!session || !hasWorkoutProgress(session)) return

    void finishWorkout()
      .then((completed) => {
        if (!completed) return
        if (!showWorkoutCompleteSummary(completed)) {
          goHome()
        }
      })
      .catch((error) => console.error('[workout] failed to finish workout', error))
  }, [finishWorkout, goHome, session, showWorkoutCompleteSummary])

  const handlePrevious = useCallback(() => {
    for (let index = currentExerciseIndex - 1; index >= 0; index -= 1) {
      const id = effectiveExercises[index]?.id
      if (id && (isExerciseLogged(id) || isExerciseSkipped(id))) {
        setCurrentExerciseIndex(index)
        return
      }
    }
  }, [currentExerciseIndex, effectiveExercises, isExerciseLogged, isExerciseSkipped])

  const handleNext = useCallback(() => {
    const exercise = effectiveExercises[currentExerciseIndex]
    if (!exercise) return
    const exerciseLog = getExerciseLog(exercise.id)
    if (!canAdvanceFromExercise(exerciseLog)) return

    const nextIndex = Math.min(effectiveExercises.length - 1, currentExerciseIndex + 1)
    if (nextIndex === currentExerciseIndex) return

    setCurrentExerciseIndex(nextIndex)
  }, [currentExerciseIndex, effectiveExercises, getExerciseLog])

  const handleFinish = useCallback(() => {
    if (!session) return

    const exercise = effectiveExercises[currentExerciseIndex]
    if (!exercise) return
    const exerciseLog = getExerciseLog(exercise.id)
    if (!canAdvanceFromExercise(exerciseLog)) return

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
    effectiveExercises,
    finishWorkout,
    getExerciseLog,
    goHome,
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
    (
      exerciseId: string,
      setNumber: number,
      updates?: Parameters<typeof completeSet>[2],
    ) => {
      const exercise = effectiveExercises.find((item) => item.id === exerciseId)
      if (!exercise) return

      completeSet(exerciseId, setNumber, updates)
      const catalog = getCatalogExerciseById(exercise.catalogExerciseId)
      const seconds = catalog ? getDefaultRestSeconds(catalog) : exercise.suggestedRestSeconds
      startWithDuration(seconds)
    },
    [completeSet, effectiveExercises, startWithDuration],
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
      const updated = skipExercise(exerciseId)
      if (!updated) return

      const isLast = currentExerciseIndex >= effectiveExercises.length - 1
      const isFullBodyMain =
        isStructuredFullBodySession(updated) && updated.fullBody?.currentSegment === 'main'

      if (isLast && !isFullBodyMain) {
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

      if (!isLast) {
        setCurrentExerciseIndex((index) => Math.min(effectiveExercises.length - 1, index + 1))
      }
    },
    [
      currentExerciseIndex,
      effectiveExercises.length,
      discardActiveWorkout,
      finishWorkout,
      goHome,
      showWorkoutCompleteSummary,
      skipExercise,
    ],
  )

  const handleRemoveExercise = useCallback(
    (exerciseId: string) => {
      const updated = removeExerciseFromSession(exerciseId)
      if (!updated) return

      setCurrentExerciseIndex((index) => {
        const newEffective = updated.exerciseOrder
          ? updated.exerciseOrder
          : effectiveExercises.filter((e) => e.id !== exerciseId).map((e) => e.id)
        const clampedIndex = Math.min(index, Math.max(0, newEffective.length - 1))
        if (effectiveExercises[index]?.id === exerciseId) {
          return Math.min(index, newEffective.length - 1)
        }
        return clampedIndex
      })
    },
    [effectiveExercises, removeExerciseFromSession],
  )

  const handleReorderExercises = useCallback(
    (newOrder: string[]) => {
      reorderExercises(newOrder)
    },
    [reorderExercises],
  )

  const handleJumpToExercise = useCallback(
    (index: number) => {
      setCurrentExerciseIndex(index)
    },
    [],
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {showWorkoutTimers && (
        <TimerBar
          remaining={timerRemaining}
          duration={timerDuration}
          status={timerStatus}
          muted={muted}
          elapsedSeconds={workoutElapsedSeconds}
          embedded
          onStart={start}
          onPause={pause}
          onReset={reset}
          onAdjust={adjustRemaining}
          onSetDuration={setDuration}
          onToggleMute={() => setMuted((value) => !value)}
        />
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

      <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {screen === 'home' && (
          <HomeScreen
            userEmail={user?.email}
            onSignOut={() => void signOut()}
            onEditRoutine={refreshProfile}
            onProgramChanged={() => {
              refreshProfile()
              refresh()
            }}
            onStartBuilderWorkout={handleStartRecommendedWorkout}
          />
        )}

        {screen !== 'home' && (
          <AiCoachLayout showFloatingTrigger>
            {screen === 'workout' && selectedWorkoutType && workoutStarted && session && isStructuredFullBodySession(session) && (
              <FullBodyWorkoutFlow
                session={session}
                mainExercises={effectiveExercises}
                currentMainExerciseIndex={currentExerciseIndex}
                onMainExerciseIndexChange={setCurrentExerciseIndex}
                getExerciseLog={getExerciseLog}
                onUpdateSet={handleUpdateSet}
                onPrefillSets={(exerciseId, weight, reps) => prefillExerciseSets(exerciseId, weight, reps)}
                onCompleteSet={handleCompleteSet}
                onAddSet={handleAddSet}
                onDeleteSet={handleDeleteSet}
                onSkipExercise={handleSkipExercise}
                onRemoveExercise={handleRemoveExercise}
                onReorderExercises={handleReorderExercises}
                isExerciseLogged={isExerciseLogged}
                isExerciseSkipped={isExerciseSkipped}
                setFullBodySegment={setFullBodySegment}
                updateFullBodyGuidedState={updateFullBodyGuidedState}
                completeGuidedSegment={completeGuidedSegment}
                onBack={handleBackFromWorkout}
                onFinishWorkout={handleFinishFullBodyWorkout}
                muted={muted}
              />
            )}

            {screen === 'workout' && selectedWorkoutType && workoutStarted && session && !isStructuredFullBodySession(session) && (
              <WorkoutDeck
                workoutId={selectedWorkoutType}
                exercises={effectiveExercises}
                currentExerciseIndex={currentExerciseIndex}
                getExerciseLog={getExerciseLog}
                onUpdateSet={handleUpdateSet}
                onPrefillSets={(exerciseId, weight, reps) => prefillExerciseSets(exerciseId, weight, reps)}
                onCompleteSet={handleCompleteSet}
                onAddSet={handleAddSet}
                onDeleteSet={handleDeleteSet}
                onSkipExercise={handleSkipExercise}
                onRemoveExercise={handleRemoveExercise}
                onReorderExercises={handleReorderExercises}
                onJumpToExercise={handleJumpToExercise}
                isExerciseLogged={isExerciseLogged}
                isExerciseSkipped={isExerciseSkipped}
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
                initialExercises={previewExercises ?? undefined}
                titleOverride={previewTitle ?? undefined}
                descriptionOverride={previewDescription ?? undefined}
                lockTemplateSource={Boolean(previewExercises)}
              />
            )}

            {screen === 'timer-only' && <TimerOnlyView onBack={goHome} />}

            {screen === 'core-view' && (
              <CoreView
                onBack={goHome}
                onLog={(durationMinutes) => {
                  const date = toDateString(new Date())
                  appendManualActivity(date, {
                    id: `${date}-Core-${crypto.randomUUID().slice(0, 8)}`,
                    date,
                    type: 'Core',
                    durationMinutes,
                    source: 'manual',
                  })
                  refresh()
                }}
              />
            )}

            {screen === 'mobility' && (
              <MobilityView
                onBack={goHome}
                onLog={(durationMinutes) => {
                  const date = toDateString(new Date())
                  appendManualActivity(date, {
                    id: `${date}-Mobility-${crypto.randomUUID().slice(0, 8)}`,
                    date,
                    type: 'Mobility',
                    durationMinutes,
                    source: 'manual',
                  })
                  refresh()
                }}
              />
            )}

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
          </AiCoachLayout>
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
          coreLoggedToday={activityHistory.at(-1)?.activities.some((a) => a.type === 'Core') ?? false}
          onDismiss={handleDismissWorkoutComplete}
          onAddCore={() => {
            setWorkoutCompleteOpen(false)
            setWorkoutCompleteData(null)
            setScreen('core-view')
          }}
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <AuthGate>
        <WorkoutApp />
      </AuthGate>
    </div>
  )
}

export default App
