import type { WeeklyPlanDay } from '../services/recommendationService'

const TYPE_COLORS: Record<string, string> = {
  Push: 'bg-red-500/20 text-red-300 border-red-500/30',
  Pull: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  Leg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Core: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Mobility: 'bg-green-500/20 text-green-300 border-green-500/30',
  Rest: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  Swim: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  Bike: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
}

interface WeeklyPlanViewProps {
  plan: WeeklyPlanDay[]
}

export function WeeklyPlanView({ plan }: WeeklyPlanViewProps) {
  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        This week's plan
      </p>
      <div className="grid grid-cols-7 gap-2">
        {plan.map((day) => {
          const color = TYPE_COLORS[day.displayType] ?? TYPE_COLORS.Rest

          return (
            <div key={day.date} className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">{day.dayLabel.slice(0, 3)}</span>
              <div className={`flex w-full items-center justify-center rounded-xl border px-1 py-3 ${color}`}>
                <span className="text-center text-xs font-semibold leading-tight">
                  {day.displayType}
                </span>
              </div>
              <p className="hidden text-center text-xs leading-tight text-zinc-500 sm:block line-clamp-2">
                {day.recommendation.reason}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
