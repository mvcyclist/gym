import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CheckIn, GlobalFeeling, RegionStatus } from '../types/checkIn'
import {
  BODY_REGIONS,
  REGION_STATUSES,
  REGION_STATUS_LABELS,
  emptyCheckInRegions,
} from '../types/checkIn'
import type { Exercise, WorkoutCategory } from '../types/workout'
import { buildRecommendedWorkout, type RecommendedWorkout } from '../services/recommendedWorkoutService'
import { getUserProfile } from '../services/userProfileRepository'
import type { LoadTier } from '../data/exerciseCatalog'

type Step = 'feeling' | 'regions' | 'preview' | 'skip'

interface RecommendedWorkoutFlowProps {
  open: boolean
  category: WorkoutCategory
  onClose: () => void
  onStart: (category: WorkoutCategory, exercises: Exercise[]) => void
}

const FEELING_OPTIONS: Array<{ id: Exclude<GlobalFeeling, 'skip'>; label: string; hint: string }> = [
  { id: 'good', label: 'Good to go', hint: 'Full volume' },
  { id: 'meh', label: 'A bit meh', hint: 'Reduced volume' },
  { id: 'beat_up', label: 'Beat up', hint: 'Minimal volume' },
]

const LOAD_TIER_LABEL: Record<LoadTier, string> = {
  heavy: 'Heavy',
  moderate: 'Moderate',
  low_impact: 'Low impact',
}

export function RecommendedWorkoutFlow({
  open,
  category,
  onClose,
  onStart,
}: RecommendedWorkoutFlowProps) {
  const [step, setStep] = useState<Step>('feeling')
  const [global, setGlobal] = useState<Exclude<GlobalFeeling, 'skip'> | null>(null)
  const [regions, setRegions] = useState(emptyCheckInRegions)
  const [recommendation, setRecommendation] = useState<RecommendedWorkout | null>(null)

  const checkIn: CheckIn | null = useMemo(() => {
    if (!global) return null
    return { global, regions }
  }, [global, regions])

  if (!open) return null

  const reset = () => {
    setStep('feeling')
    setGlobal(null)
    setRegions(emptyCheckInRegions())
    setRecommendation(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSkipDay = () => {
    setStep('skip')
  }

  const buildPreview = (nextCheckIn: CheckIn) => {
    const built = buildRecommendedWorkout(nextCheckIn, category, getUserProfile())
    setRecommendation(built)
    setStep(built ? 'preview' : 'skip')
  }

  const handleFeeling = (feeling: Exclude<GlobalFeeling, 'skip'>) => {
    setGlobal(feeling)
    setStep('regions')
  }

  const handleBuild = () => {
    if (!checkIn) return
    buildPreview(checkIn)
  }

  const setRegionStatus = (region: keyof typeof regions, status: RegionStatus) => {
    setRegions((prev) => ({ ...prev, [region]: status }))
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.72)',
        padding: 16,
      }}
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#111',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: '1.25rem 1.25rem 1.5rem',
          position: 'relative',
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '0.5px solid rgba(255,255,255,0.2)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ×
        </button>

        {step === 'feeling' && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', marginBottom: 8 }}>
              CHECK-IN
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>
              How are you feeling overall?
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 8, marginBottom: 20 }}>
              This sets today&apos;s volume. Pain comes next — per body area.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FEELING_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleFeeling(option.id)}
                  style={{
                    textAlign: 'left',
                    background: '#1a1a1a',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{option.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(239,68,68,0.75)', marginTop: 2 }}>{option.hint}</div>
                </button>
              ))}
              <button
                type="button"
                onClick={handleSkipDay}
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: 14,
                }}
              >
                Skip today — sick or sharp pain
              </button>
            </div>
          </>
        )}

        {step === 'regions' && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', marginBottom: 8 }}>
              CHECK-IN
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>
              How&apos;s each area feeling?
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 8, marginBottom: 20 }}>
              Answer body parts, not exercises — we&apos;ll match the right variant per pattern.
            </p>
            <p style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 12,
            }}>
              Regions
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {BODY_REGIONS.map((region) => (
                <div key={region.id}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
                    {region.label}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {REGION_STATUSES.map((status) => {
                      const selected = regions[region.id] === status
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setRegionStatus(region.id, status)}
                          style={{
                            borderRadius: 999,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: selected
                              ? '1px solid #ef4444'
                              : '0.5px solid rgba(255,255,255,0.1)',
                            background: selected ? 'rgba(239,68,68,0.08)' : '#1a1a1a',
                            color: selected ? '#fff' : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          {REGION_STATUS_LABELS[status]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleBuild}
              style={{
                width: '100%',
                background: '#ef4444',
                border: 'none',
                borderRadius: 10,
                padding: '14px 16px',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Build my workout
            </button>
          </>
        )}

        {step === 'skip' && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', marginBottom: 8 }}>
              CHECK-IN
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>
              Rest is the move
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 10, marginBottom: 24 }}>
              No strength session today. Come back when you feel ready.
            </p>
            <button
              type="button"
              onClick={handleClose}
              style={{
                width: '100%',
                background: '#ef4444',
                border: 'none',
                borderRadius: 10,
                padding: '14px 16px',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Back to home
            </button>
          </>
        )}

        {step === 'preview' && recommendation && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', marginBottom: 8 }}>
              TODAY&apos;S SESSION
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>
              {recommendation.title}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 6, marginBottom: 18 }}>
              {recommendation.subtitle}
            </p>
            <p style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 10,
            }}>
              Exercises
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {recommendation.exercises.map((exercise, index) => {
                const meta = recommendation.metaByExerciseId[exercise.id]
                const tierLabel = meta?.loadTier ? LOAD_TIER_LABEL[meta.loadTier] : null
                return (
                  <div
                    key={exercise.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: '#1a1a1a',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', width: 18 }}>
                      {index + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{exercise.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {exercise.sets} × {exercise.reps}
                      </div>
                    </div>
                    {tierLabel && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: '#f87171',
                        border: '0.5px solid rgba(239,68,68,0.45)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        flexShrink: 0,
                      }}>
                        {tierLabel}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setRecommendation(null)
                  setStep('feeling')
                  setGlobal(null)
                  setRegions(emptyCheckInRegions())
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '0.5px solid rgba(255,255,255,0.2)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Start over
              </button>
              <button
                type="button"
                onClick={() => {
                  onStart(recommendation.category, recommendation.exercises)
                  reset()
                }}
                style={{
                  flex: 1.2,
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 16px',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Start workout
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
