import { useEffect } from 'react'
import type { WorkoutCategory } from '../types/workout'

interface Option {
  label: string
  description: string
  action: 'workout' | 'mobility' | 'timer'
  workoutId?: WorkoutCategory
}

const OPTIONS: Option[] = [
  { label: 'Push', description: 'Chest, shoulders, triceps', action: 'workout', workoutId: 'push' },
  { label: 'Pull', description: 'Back, biceps', action: 'workout', workoutId: 'pull' },
  { label: 'Leg', description: 'Quads, hamstrings, glutes', action: 'workout', workoutId: 'leg' },
  { label: 'Core', description: 'Abs and stability', action: 'workout', workoutId: 'core' },
  { label: 'Mobility', description: 'Stretching and recovery', action: 'mobility' },
  { label: 'Timer only', description: 'No logging, just the clock', action: 'timer' },
]

interface ChooseAnotherModalProps {
  open: boolean
  onClose: () => void
  onSelectWorkout: (id: WorkoutCategory) => void
  onSelectMobility: () => void
  onSelectTimer: () => void
}

export function ChooseAnotherModal({
  open,
  onClose,
  onSelectWorkout,
  onSelectMobility,
  onSelectTimer,
}: ChooseAnotherModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleSelect = (option: Option) => {
    if (option.action === 'workout' && option.workoutId) {
      onSelectWorkout(option.workoutId)
    } else if (option.action === 'mobility') {
      onSelectMobility()
    } else {
      onSelectTimer()
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Choose a workout
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 transition hover:text-zinc-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => handleSelect(option)}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-left transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <span className="font-semibold text-white">{option.label}</span>
              <span className="text-xs text-zinc-500">{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
