import type { DayActivity } from '../types/training'

const TYPE_COLORS: Record<string, string> = {
  Push: 'bg-red-500',
  Pull: 'bg-orange-500',
  Leg: 'bg-blue-500',
  'Full Body': 'bg-orange-600',
  Core: 'bg-purple-500',
  Mobility: 'bg-green-500',
  Walk: 'bg-green-400',
  Rest: 'bg-zinc-500',
  Swim: 'bg-cyan-500',
  Bike: 'bg-yellow-500',
  Other: 'bg-zinc-500',
}

interface SnakeDayTileProps {
  day: DayActivity
  variant: 'past' | 'future'
  displayType?: string
  onClick?: () => void
}

export function SnakeDayTile({ day, variant, displayType, onClick }: SnakeDayTileProps) {
  const opacity = variant === 'past' ? 'opacity-60' : 'opacity-75'
  const activities = displayType
    ? [{ id: 'plan', type: displayType, intensity: undefined }]
    : day.activities

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-col rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-left transition hover:border-zinc-600 ${opacity}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {day.dayLabel.slice(0, 3)}
      </span>
      <div className="mt-1.5 flex flex-col gap-1">
        {activities.length === 0 ? (
          <span className="text-xs text-zinc-600">—</span>
        ) : (
          activities.map((activity) => (
            <span key={activity.id} className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_COLORS[activity.type] ?? 'bg-zinc-500'}`}
                aria-hidden
              />
              {activity.type}
            </span>
          ))
        )}
      </div>
    </button>
  )
}
