import { useState } from 'react'
import { toDateString } from '../utils/activityHistory'
import { ACTIVITY_TYPES, INTENSITY_LEVELS } from '../types/training'
import type { ActivityType, Intensity } from '../types/training'

export interface BackfillRow {
  offset: number
  label: string
  enabled: boolean
  type: ActivityType | null
  intensity: Intensity
}

interface BackfillRecentActivityModalProps {
  open: boolean
  onClose: () => void
  onSave: (rows: BackfillRow[]) => void
}

const DEFAULT_ROWS: Omit<BackfillRow, 'enabled' | 'type' | 'intensity'>[] = [
  { offset: 3, label: '3 days ago' },
  { offset: 2, label: '2 days ago' },
  { offset: 1, label: 'Yesterday' },
]

function createInitialRows(): BackfillRow[] {
  return DEFAULT_ROWS.map((row) => ({
    ...row,
    enabled: true,
    type: null,
    intensity: 'Moderate',
  }))
}

export function BackfillRecentActivityModal({
  open,
  onClose,
  onSave,
}: BackfillRecentActivityModalProps) {
  const [rows, setRows] = useState<BackfillRow[]>(createInitialRows)

  if (!open) return null

  const updateRow = (offset: number, updates: Partial<BackfillRow>) => {
    setRows((current) =>
      current.map((row) => (row.offset === offset ? { ...row, ...updates } : row)),
    )
  }

  const handleSave = () => {
    const validRows = rows.filter((row) => row.enabled && row.type !== null)
    if (validRows.length === 0) return
    onSave(validRows)
    setRows(createInitialRows())
    onClose()
  }

  const selectedCount = rows.filter((row) => row.enabled && row.type !== null).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backfill-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl">
        <div className="sticky top-0 border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <h2 id="backfill-title" className="text-lg font-bold text-white">
            Log recent days
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Add 3–4 days of any activity — strength, cardio, mobility, or rest.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          {rows.map((row) => {
            const date = (() => {
              const d = new Date()
              d.setDate(d.getDate() - row.offset)
              return toDateString(d)
            })()

            return (
              <div
                key={row.offset}
                className={`rounded-xl border p-4 ${
                  row.enabled ? 'border-zinc-700 bg-zinc-900/60' : 'border-zinc-800/60 opacity-50'
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{row.label}</p>
                    <p className="text-xs text-zinc-500">{date}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(event) =>
                        updateRow(row.offset, { enabled: event.target.checked })
                      }
                      className="rounded border-zinc-600"
                    />
                    Include
                  </label>
                </div>

                {row.enabled && (
                  <>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Activity
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {ACTIVITY_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateRow(row.offset, { type })}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            row.type === type
                              ? 'bg-red-600 text-white'
                              : 'border border-zinc-700 text-zinc-400 hover:border-zinc-500'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Intensity
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {INTENSITY_LEVELS.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => updateRow(row.offset, { intensity: level })}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            row.intensity === level
                              ? 'bg-zinc-700 text-white'
                              : 'border border-zinc-700 text-zinc-500'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
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
            disabled={selectedCount === 0}
            className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition enabled:hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save {selectedCount > 0 ? `(${selectedCount} days)` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
