import { useState } from 'react'
import type { WorkoutType, Intensity, DayActivity } from '../types/training'
import { toDateString } from '../utils/activityHistory'
import { getCardioDef } from '../data/cardioCatalog'

function daysSinceLastOfType(history: DayActivity[], type: WorkoutType): number | null {
  const today = toDateString(new Date())
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date))
  for (const day of sorted) {
    if (day.date >= today) continue
    if (day.activities.some((a) => a.type === type)) {
      const diff = Math.round(
        (new Date(today).getTime() - new Date(day.date).getTime()) / (1000 * 60 * 60 * 24),
      )
      return diff
    }
  }
  return null
}

interface CardioLogScreenProps {
  type: WorkoutType
  history: DayActivity[]
  onLog: (entry: {
    type: WorkoutType
    durationMinutes: number
    intensity: Intensity
    distanceMeters?: number
    distanceMiles?: number
  }) => void
  onBack: () => void
}

export function CardioLogScreen({ type, history, onLog, onBack }: CardioLogScreenProps) {
  const def = getCardioDef(type)
  const [duration, setDuration] = useState(def?.durationDefaultMinutes ?? 30)
  const [intensity, setIntensity] = useState<Intensity | null>(type === 'Walk' ? 'Easy' : null)
  const [distance, setDistance] = useState('')

  const isWalk = type === 'Walk'
  const isSwim = type === 'Swim'
  const canLog = intensity !== null

  const daysSince = daysSinceLastOfType(history, type)
  const subtitle = daysSince === null
    ? 'No recent sessions — fully fresh'
    : daysSince === 0
      ? 'Last session: today'
      : `Last: ${daysSince} day${daysSince === 1 ? '' : 's'} ago`

  const handleLog = () => {
    if (!intensity) return
    const distVal = distance ? parseFloat(distance) : undefined
    onLog({
      type,
      durationMinutes: duration,
      intensity,
      distanceMeters: isSwim && distVal ? distVal : undefined,
      distanceMiles: !isSwim && distVal ? distVal : undefined,
    })
  }

  const stepDuration = (delta: number) => {
    setDuration((d) => Math.min(180, Math.max(10, d + delta)))
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 text-zinc-400 transition hover:text-white"
          aria-label="Back"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {def?.emoji ?? ''} {type}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Duration */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Duration
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => stepDuration(-5)}
              disabled={duration <= 10}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-lg font-bold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-30"
            >
              −
            </button>
            <span className="min-w-[6rem] text-center text-2xl font-bold text-white">
              {duration} min
            </span>
            <button
              type="button"
              onClick={() => stepDuration(5)}
              disabled={duration >= 180}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-lg font-bold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>

        {/* Distance */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Distance <span className="normal-case font-normal text-zinc-600">(optional)</span>
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step={isSwim ? '1' : '0.1'}
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder={isSwim ? '0' : '0.0'}
              className="w-32 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
            <span className="text-sm text-zinc-500">{def?.distanceUnit ?? (isSwim ? 'meters' : 'miles')}</span>
          </div>
        </div>

        {/* Intensity */}
        {!isWalk && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Intensity
            </p>
            <div className="flex gap-2">
              {(['Easy', 'Moderate', 'Hard'] as Intensity[]).map((level) => {
                const selected = intensity === level
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setIntensity(level)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition
                      ${selected
                        ? 'border-red-500 bg-red-500/20 text-red-400'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'
                      }`}
                  >
                    {level}
                  </button>
                )
              })}
            </div>
            {intensity && def?.intensityDescriptions[intensity] && (
              <p className="mt-2 text-xs text-zinc-500">
                {def.intensityDescriptions[intensity]}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-10">
        <button
          type="button"
          onClick={handleLog}
          disabled={!canLog}
          className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Log {type.toLowerCase()}
        </button>
      </div>
    </div>
  )
}
