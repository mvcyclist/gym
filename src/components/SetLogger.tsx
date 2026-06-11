import type { SetLog } from '../types/workout'
import { sanitizeRepsInput, sanitizeWeightInput } from '../utils/weightInput'

interface SetLoggerProps {
  sets: SetLog[]
  targetReps: string
  onUpdateSet: (setNumber: number, updates: Partial<Pick<SetLog, 'weight' | 'reps'>>) => void
  onCompleteSet: (setNumber: number) => void
  onAddSet: () => void
  onDeleteSet: (setNumber: number) => void
}

export function SetLogger({
  sets,
  targetReps,
  onUpdateSet,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
}: SetLoggerProps) {
  const completedCount = sets.filter((set) => set.completed).length
  const allComplete = sets.length > 0 && completedCount === sets.length
  const canDelete = sets.length > 1

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/50 px-5 py-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Set logger
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Target: {sets.length} × {targetReps}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              allComplete ? 'bg-green-500/15 text-green-400' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {completedCount}/{sets.length} sets
          </span>
          <button
            type="button"
            onClick={onAddSet}
            className="rounded-lg border border-red-500/50 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/25"
          >
            + Add set
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sets.map((set) => (
          <div
            key={set.setNumber}
            className={`rounded-xl border p-3 sm:p-4 ${
              set.completed
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-300">Set {set.setNumber}</span>
              <button
                type="button"
                onClick={() => onDeleteSet(set.setNumber)}
                disabled={!canDelete}
                aria-label={`Remove set ${set.setNumber}`}
                className="rounded-md px-2 py-1 text-xs font-semibold text-zinc-500 transition enabled:hover:bg-red-500/10 enabled:hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:gap-3">
              <label className="min-w-0">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Weight (lbs or BW)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={set.weight}
                  disabled={set.completed}
                  onChange={(event) =>
                    onUpdateSet(set.setNumber, {
                      weight: sanitizeWeightInput(event.target.value),
                    })
                  }
                  placeholder="0 or BW"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none disabled:opacity-60"
                />
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Reps
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={set.reps}
                  disabled={set.completed}
                  onChange={(event) =>
                    onUpdateSet(set.setNumber, { reps: sanitizeRepsInput(event.target.value) })
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-base text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none disabled:opacity-60"
                />
              </label>

              <button
                type="button"
                onClick={() => onCompleteSet(set.setNumber)}
                disabled={set.completed}
                className="col-span-2 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-red-500 disabled:cursor-default disabled:bg-green-600/20 disabled:text-green-400 sm:col-span-1 sm:mt-5 sm:px-4"
              >
                {set.completed ? 'Done' : 'Complete'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {allComplete && (
        <p className="mt-4 text-center text-sm font-medium text-green-400">
          All sets logged — rest up, then move to the next exercise.
        </p>
      )}
    </div>
  )
}
