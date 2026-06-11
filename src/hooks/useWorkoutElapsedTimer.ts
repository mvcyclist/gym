import { useEffect, useState } from 'react'
import { getWorkoutElapsedSeconds } from '../utils/workoutTimer'
import type { WorkoutSession } from '../types/workout'

export function useWorkoutElapsedTimer(session: WorkoutSession | null): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!session || session.status !== 'active') {
      setElapsedSeconds(session ? getWorkoutElapsedSeconds(session) : 0)
      return
    }

    const tick = () => setElapsedSeconds(getWorkoutElapsedSeconds(session))
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [session])

  return elapsedSeconds
}
