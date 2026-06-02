import type { DayActivity } from '../types/training'

interface ActivityHistoryStripProps {
  days: DayActivity[]
  onEditDay: (day: DayActivity) => void
}

function intensityDot(intensity?: string): string {
  if (intensity === 'Hard') return 'bg-red-500'
  if (intensity === 'Moderate') return 'bg-amber-400'
  if (intensity === 'Easy') return 'bg-green-500'
  return 'bg-zinc-600'
}

export function ActivityHistoryStrip({ days, onEditDay }: ActivityHistoryStripProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Last 7 days
        </p>
        <p className="text-xs text-zinc-600">Tap a day to edit</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={() => onEditDay(day)}
            className="flex min-w-[5.5rem] shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-left transition hover:border-zinc-600 hover:bg-zinc-900"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {day.dayLabel}
            </span>

            <div className="mt-2 flex min-h-[4.5rem] flex-col gap-1.5">
              {day.activities.length === 0 ? (
                <span className="text-xs text-zinc-600">No activity</span>
              ) : (
                day.activities.map((activity) => (
                  <span
                    key={activity.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-200"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${intensityDot(activity.intensity)}`}
                      aria-hidden
                    />
                    {activity.type}
                  </span>
                ))
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
