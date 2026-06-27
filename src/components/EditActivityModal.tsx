import { useEffect, useState } from 'react'
import { createActivityEntry } from '../utils/activityHistory'
import { ACTIVITY_TYPES, INTENSITY_LEVELS } from '../types/training'
import type { ActivityEntry, ActivityType, DayActivity, Intensity } from '../types/training'
import { getCardioDef, isCardioType } from '../data/cardioCatalog'

interface EditActivityModalProps {
  day: DayActivity | null
  onClose: () => void
  onSave: (date: string, activities: ActivityEntry[]) => void
  onDeleteWorkout?: (sessionId: string) => void
}

interface DraftActivity {
  localId: string
  type: ActivityType
  intensity?: Intensity
  durationMinutes?: number
  distance?: string
  notes?: string
}

function isLoggedWorkout(activity: ActivityEntry): boolean {
  return activity.source === 'workout' && Boolean(activity.sessionId)
}

export function EditActivityModal({ day, onClose, onSave, onDeleteWorkout }: EditActivityModalProps) {
  const [drafts, setDrafts] = useState<DraftActivity[]>([])
  const [workoutActivities, setWorkoutActivities] = useState<ActivityEntry[]>([])
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (!day) {
      setDrafts([])
      setWorkoutActivities([])
      setConfirmDeleteSessionId(null)
      return
    }

    setWorkoutActivities(day.activities.filter(isLoggedWorkout))
    setDrafts(
      day.activities
        .filter((activity) => !isLoggedWorkout(activity))
        .map((activity) => ({
          localId: activity.id,
          type: activity.type,
          intensity: activity.intensity,
          durationMinutes: activity.durationMinutes,
          notes: activity.notes,
        })),
    )
    setConfirmDeleteSessionId(null)
  }, [day])

  if (!day) return null

  const addActivity = (type: ActivityType) => {
    setDrafts((current) => [
      ...current,
      { localId: crypto.randomUUID(), type, intensity: 'Moderate' },
    ])
  }

  const removeManualActivity = (localId: string) => {
    setDrafts((current) => current.filter((item) => item.localId !== localId))
  }

  const updateDraft = (localId: string, updates: Partial<DraftActivity>) => {
    setDrafts((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...updates } : item)),
    )
  }

  const handleDeleteWorkout = (sessionId: string) => {
    onDeleteWorkout?.(sessionId)
    setWorkoutActivities((current) => current.filter((item) => item.sessionId !== sessionId))
    setConfirmDeleteSessionId(null)
  }

  const handleSave = () => {
    const activities = drafts.map((draft) => {
      const cardioDef = isCardioType(draft.type) ? getCardioDef(draft.type) : undefined
      const distVal = draft.distance ? parseFloat(draft.distance) : undefined
      return createActivityEntry(day.date, draft.type, {
        intensity: draft.intensity,
        durationMinutes: draft.durationMinutes,
        distanceMeters: cardioDef?.distanceUnit === 'meters' && distVal ? distVal : undefined,
        distanceMiles: cardioDef?.distanceUnit === 'miles' && distVal ? distVal : undefined,
        notes: draft.notes,
        source: 'manual',
      })
    })
    onSave(day.date, activities)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-activity-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl">
        <div className="sticky top-0 border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <h2 id="edit-activity-title" className="text-lg font-bold text-white">
            {day.dayLabel} — {day.date}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Logged workouts and manual activities for this day.
          </p>
        </div>

        <div className="space-y-5 px-5 py-5">
          {workoutActivities.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Logged workouts
              </p>
              <div className="space-y-3">
                {workoutActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{activity.type}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {activity.sessionStatus === 'partial' ? 'Partial session' : 'Completed session'}
                          {activity.durationMinutes ? ` · ${activity.durationMinutes} min` : ''}
                        </p>
                      </div>
                      {onDeleteWorkout && activity.sessionId && (
                        <div className="shrink-0">
                          {confirmDeleteSessionId === activity.sessionId ? (
                            <div className="flex flex-col items-end gap-2">
                              <p className="text-right text-xs text-zinc-400">Delete this workout?</p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteSessionId(null)}
                                  className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-400"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWorkout(activity.sessionId!)}
                                  className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteSessionId(activity.sessionId!)}
                              className="text-xs font-semibold text-zinc-500 hover:text-red-400"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Manual activities
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {ACTIVITY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addActivity(type)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-red-500/50 hover:text-red-300"
                >
                  + {type}
                </button>
              ))}
            </div>

            {drafts.length === 0 ? (
              <p className="text-sm text-zinc-500">No manual activities. Add one above.</p>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft, index) => (
                  <div
                    key={draft.localId}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        {index + 1}. {draft.type}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeManualActivity(draft.localId)}
                        className="text-xs font-semibold text-zinc-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>

                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Intensity
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {INTENSITY_LEVELS.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => updateDraft(draft.localId, { intensity: level })}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            draft.intensity === level
                              ? 'bg-red-600 text-white'
                              : 'border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>

                    <label className="block">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Duration (minutes, optional)
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={draft.durationMinutes ?? ''}
                        onChange={(event) =>
                          updateDraft(draft.localId, {
                            durationMinutes: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                      />
                    </label>

                    {isCardioType(draft.type) && (() => {
                      const cardioDef = getCardioDef(draft.type)
                      return (
                        <label className="mt-3 block">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Distance ({cardioDef?.distanceUnit ?? 'units'}, optional)
                          </span>
                          <input
                            type="number"
                            min="0"
                            step={cardioDef?.distanceUnit === 'meters' ? '1' : '0.1'}
                            value={draft.distance ?? ''}
                            onChange={(event) =>
                              updateDraft(draft.localId, {
                                distance: event.target.value || undefined,
                              })
                            }
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                          />
                        </label>
                      )
                    })()}

                    <label className="mt-3 block">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Notes (optional)
                      </span>
                      <input
                        type="text"
                        value={draft.notes ?? ''}
                        onChange={(event) =>
                          updateDraft(draft.localId, { notes: event.target.value || undefined })
                        }
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Save manual
          </button>
        </div>
      </div>
    </div>
  )
}
