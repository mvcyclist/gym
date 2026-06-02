import { useEffect, useState } from 'react'
import { createActivityEntry } from '../utils/activityHistory'
import { ACTIVITY_TYPES, INTENSITY_LEVELS } from '../types/training'
import type { ActivityEntry, ActivityType, DayActivity, Intensity } from '../types/training'

interface EditActivityModalProps {
  day: DayActivity | null
  onClose: () => void
  onSave: (date: string, activities: ActivityEntry[]) => void
}

interface DraftActivity {
  localId: string
  type: ActivityType
  intensity?: Intensity
  durationMinutes?: number
  notes?: string
}

export function EditActivityModal({ day, onClose, onSave }: EditActivityModalProps) {
  const [drafts, setDrafts] = useState<DraftActivity[]>([])

  useEffect(() => {
    if (!day) {
      setDrafts([])
      return
    }

    setDrafts(
      day.activities.map((activity) => ({
        localId: activity.id,
        type: activity.type,
        intensity: activity.intensity,
        durationMinutes: activity.durationMinutes,
        notes: activity.notes,
      })),
    )
  }, [day])

  if (!day) return null

  const addActivity = (type: ActivityType) => {
    setDrafts((current) => [
      ...current,
      { localId: crypto.randomUUID(), type, intensity: 'Moderate' },
    ])
  }

  const removeActivity = (localId: string) => {
    setDrafts((current) => current.filter((item) => item.localId !== localId))
  }

  const updateDraft = (localId: string, updates: Partial<DraftActivity>) => {
    setDrafts((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...updates } : item)),
    )
  }

  const handleSave = () => {
    const activities = drafts.map((draft) =>
      createActivityEntry(day.date, draft.type, {
        intensity: draft.intensity,
        durationMinutes: draft.durationMinutes,
        notes: draft.notes,
      }),
    )
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
            Edit activity — {day.dayLabel}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">{day.date}</p>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Add activity
            </p>
            <div className="flex flex-wrap gap-2">
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
          </div>

          {drafts.length === 0 ? (
            <p className="text-sm text-zinc-500">No activities yet. Add one above.</p>
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
                      onClick={() => removeActivity(draft.localId)}
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

        <div className="sticky bottom-0 flex gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
