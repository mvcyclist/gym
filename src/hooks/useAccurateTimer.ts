import { useCallback, useEffect, useRef, useState } from 'react'
import { playBeep } from '../utils/audio'
import type { TimerStatus } from '../types/workout'

const DEFAULT_DURATION = 90

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
  startWithDuration: (seconds: number) => void
  adjustRemaining: (deltaSeconds: number) => void
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

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

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
    playBeep(muted)
    onCompleteRef.current?.()
  }, [muted, stopLoop])

  const tick = useCallback(() => {
    const endTime = endTimeRef.current
    if (endTime === null) return

    const nextRemaining = Math.max(0, (endTime - performance.now()) / 1000)
    remainingRef.current = nextRemaining
    setRemaining(nextRemaining)

    if (nextRemaining <= 0) {
      completeTimer()
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [completeTimer])

  const start = useCallback(() => {
    completedRef.current = false
    endTimeRef.current = performance.now() + remainingRef.current * 1000
    setStatus('running')
    stopLoop()
    rafRef.current = requestAnimationFrame(tick)
  }, [stopLoop, tick])

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
      setDurationState(safeSeconds)
      remainingRef.current = safeSeconds
      setRemaining(safeSeconds)
      setStatus('idle')
    },
    [stopLoop],
  )

  const startWithDuration = useCallback(
    (seconds: number) => {
      const safeSeconds = Math.max(0, seconds)
      stopLoop()
      completedRef.current = false
      setDurationState(safeSeconds)
      remainingRef.current = safeSeconds
      setRemaining(safeSeconds)
      endTimeRef.current = performance.now() + safeSeconds * 1000
      setStatus('running')
      rafRef.current = requestAnimationFrame(tick)
    },
    [stopLoop, tick],
  )

  const adjustRemaining = useCallback(
    (deltaSeconds: number) => {
      const nextRemaining = Math.max(0, remainingRef.current + deltaSeconds)
      remainingRef.current = nextRemaining
      setRemaining(nextRemaining)

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
    startWithDuration,
    adjustRemaining,
  }
}
