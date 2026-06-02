import type { ActivityEntry } from '../types/training'
import type { WorkoutSession } from '../types/workout'
import {
  deriveSessionIntensity,
  getSessionCalendarDate,
  getSessionDurationMinutes,
} from './sessionMetrics'
import { workoutCategoryToActivityType } from './workoutCategoryMap'

export function sessionToActivityEntry(session: WorkoutSession): ActivityEntry {
  const date = getSessionCalendarDate(session)
  const isPartial = session.status === 'partial'

  return {
    id: `workout-${session.id}`,
    date,
    type: workoutCategoryToActivityType(session.workoutType),
    intensity: deriveSessionIntensity(session),
    durationMinutes: getSessionDurationMinutes(session),
    notes: isPartial ? 'Partial workout' : undefined,
    source: 'workout',
    sessionId: session.id,
    sessionStatus: isPartial ? 'partial' : 'completed',
  }
}
