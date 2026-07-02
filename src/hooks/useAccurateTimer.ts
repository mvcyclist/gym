import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { playCompletionBeep, playCountdownBeep } from '../utils/audio'
import type { TimerStatus } from '../types/workout'

const DEFAULT_DURATION = 90
const COUNTDOWN_START_SECONDS = 5

interface UseAccurateTimerOptions {
  muted: boolean
  onComplete?: () => void
}

interface UseAccurateTimerReturn {
  duration: number
  remaining: number
  status: TimerStatus
  start: () => void
  pause: () => void
  reset: () => void
  setDuration: (seconds: number) => void
  setDurationPreset: (seconds: number) => void
  startWithDuration: (seconds: number) => void
  adjustRemaining: (deltaSeconds: number) => void
}

function displayedSeconds(remaining: number): number {
  return Math.max(0, Math.floor(remaining))
}

function maybePlayCountdownBeep(
  remaining: number,
  muted: boolean,
  lastAnnouncedSecondRef: MutableRefObject<number | null>,
): void {
  const second = displayedSeconds(remaining)
  if (second < 1 || second > COUNTDOWN_START_SECONDS) return
  if (second === lastAnnouncedSecondRef.current) return
  lastAnnouncedSecondRef.current = second
  playCountdownBeep(muted)
}

export function useAccurateTimer({
  muted,
  onComplete,
}: UseAccurateTimerOptions): UseAccurateTimerReturn {
  const [duration, setDurationState] = useState(DEFAULT_DURATION)
  const [remaining, setRemaining] = useState(DEFAULT_DURATION)
  const [status, setStatus] = useState<TimerStatus>('idle')

  const endTimeRef = useRef<number | null>(null)
  const remainingRef = useRef(DEFAULT_DURATION)
  const rafRef = useRef<number | null>(null)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const mutedRef = useRef(muted)
  const lastAnnouncedSecondRef = useRef<number | null>(null)
  const tickRef = useRef<() => void>(() => {})

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const completeTimer = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    stopLoop()
    endTimeRef.current = null
    remainingRef.current = 0
    setRemaining(0)
    setStatus('complete')
    playCompletionBeep(mutedRef.current)
    onCompleteRef.current?.()
  }, [stopLoop])

  const tick = useCallback(() => {
    const endTime = endTimeRef.current
    if (endTime === null) return

    const nextRemaining = Math.max(0, (endTime - performance.now()) / 1000)
    remainingRef.current = nextRemaining
    setRemaining(nextRemaining)
    maybePlayCountdownBeep(nextRemaining, mutedRef.current, lastAnnouncedSecondRef)

    if (nextRemaining <= 0) {
      completeTimer()
      return
    }

    rafRef.current = requestAnimationFrame(() => tickRef.current())
  }, [completeTimer])

  useEffect(() => {
    tickRef.current = tick
  }, [tick])

  const beginRunning = useCallback(() => {
    completedRef.current = false
    lastAnnouncedSecondRef.current = null
    endTimeRef.current = performance.now() + remainingRef.current * 1000
    setStatus('running')
    stopLoop()
    rafRef.current = requestAnimationFrame(() => tickRef.current())
  }, [stopLoop])

  const start = useCallback(() => {
    beginRunning()
  }, [beginRunning])

  const pause = useCallback(() => {
    if (endTimeRef.current === null) return
    stopLoop()
    endTimeRef.current = null
    setStatus('paused')
  }, [stopLoop])

  const reset = useCallback(() => {
    stopLoop()
    endTimeRef.current = null
    completedRef.current = false
    lastAnnouncedSecondRef.current = null
    remainingRef.current = duration
    setRemaining(duration)
    setStatus('idle')
  }, [duration, stopLoop])

  const setDuration = useCallback(
    (seconds: number) => {
      const safeSeconds = Math.max(0, seconds)
      stopLoop()
      endTimeRef.current = null
      completedRef.current = false
      lastAnnouncedSecondRef.current = null
      setDurationState(safeSeconds)
      remainingRef.current = safeSeconds
      setRemaining(safeSeconds)
      setStatus('idle')
    },
    [stopLoop],
  )

  const setDurationPreset = useCallback((seconds: number) => {
    const safeSeconds = Math.max(0, seconds)
    setDurationState(safeSeconds)
    if (endTimeRef.current === null && !completedRef.current) {
      remainingRef.current = safeSeconds
      setRemaining(safeSeconds)
    }
  }, [])

  const startWithDuration = useCallback(
    (seconds: number) => {
      const safeSeconds = Math.max(0, seconds)
      stopLoop()
      completedRef.current = false
      lastAnnouncedSecondRef.current = null
      setDurationState(safeSeconds)
      remainingRef.current = safeSeconds
      setRemaining(safeSeconds)
      endTimeRef.current = performance.now() + safeSeconds * 1000
      setStatus('running')
      rafRef.current = requestAnimationFrame(() => tickRef.current())
    },
    [stopLoop],
  )

  const adjustRemaining = useCallback(
    (deltaSeconds: number) => {
      const nextRemaining = Math.max(0, remainingRef.current + deltaSeconds)
      remainingRef.current = nextRemaining
      setRemaining(nextRemaining)

      const nextDisplayed = displayedSeconds(nextRemaining)
      if (nextDisplayed > COUNTDOWN_START_SECONDS || nextDisplayed < 1) {
        lastAnnouncedSecondRef.current = null
      } else {
        lastAnnouncedSecondRef.current = nextDisplayed
      }

      if (status === 'running' && endTimeRef.current !== null) {
        endTimeRef.current = performance.now() + nextRemaining * 1000
      }

      if (nextRemaining === 0 && status === 'running') {
        completeTimer()
      } else if (status === 'complete' && nextRemaining > 0) {
        completedRef.current = false
        setStatus('idle')
      }
    },
    [completeTimer, status],
  )

  useEffect(() => stopLoop, [stopLoop])

  return {
    duration,
    remaining,
    status,
    start,
    pause,
    reset,
    setDuration,
    setDurationPreset,
    startWithDuration,
    adjustRemaining,
  }
}
