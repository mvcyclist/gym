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
import {
  buildRecommendedWorkout,
  getCatalogTier,
  type RecommendedWorkout,
} from '../services/recommendedWorkoutService'
import { getUserProfile } from '../services/userProfileRepository'
import type { LoadTier } from '../data/exerciseCatalog'

type Step = 'feeling' | 'regions' | 'preview' | 'skip'

interface RecommendedWorkoutFlowProps {
  open: boolean
  category: WorkoutCategory
  onClose: () => void
  onStart: (category: WorkoutCategory, exercises: Exercise[]) => void
}

const LOAD_TIER_LABEL: Record<LoadTier, string> = {
  heavy: 'Heavy',
  moderate: 'Moderate',
  low_impact: 'TRX',
}

const TIER_BADGE_STYLE: Record<LoadTier, { color: string; border: string; background: string }> = {
  heavy: {
    color: '#f87171',
    border: '0.5px solid rgba(239,68,68,0.45)',
    background: 'rgba(239,68,68,0.12)',
  },
  moderate: {
    color: '#f0a83c',
    border: '0.5px solid rgba(240,168,60,0.45)',
    background: 'rgba(240,168,60,0.12)',
  },
  low_impact: {
    color: '#4ade80',
    border: '0.5px solid rgba(74,222,128,0.45)',
    background: 'rgba(74,222,128,0.12)',
  },
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

  const handleFeeling100 = () => {
    const next: CheckIn = { global: '100', regions: emptyCheckInRegions() }
    setGlobal('100')
    setRegions(emptyCheckInRegions())
    buildPreview(next)
  }

  const handleFeelingNot100 = () => {
    setGlobal('not_100')
    setStep('regions')
  }

  const handleBuild = () => {
    if (!checkIn) return
    buildPreview(checkIn)
  }

  const setRegionStatus = (region: keyof typeof regions, status: RegionStatus) => {
    setRegions((prev) => ({ ...prev, [region]: status }))
  }

  const handleSwapExercise = (exerciseId: string, catalogId: string) => {
    setRecommendation((prev) => {
      if (!prev) return prev
      const current = prev.exercises.find((e) => e.id === exerciseId)
      if (!current) return prev
      const meta = prev.metaByExerciseId[exerciseId]
      const option = meta?.options
        ?.flatMap((group) => group.exercises)
        .find((item) => item.id === catalogId)
      if (!option) return prev

      const nextExercise: Exercise = {
        ...current,
        catalogExerciseId: option.id,
        name: option.name,
        equipment: option.equipmentLabel
          ?? (option.equipmentKeys?.length ? option.equipmentKeys.join(', ') : current.equipment),
      }
      const nextTier = getCatalogTier(option.id) ?? meta.loadTier

      return {
        ...prev,
        exercises: prev.exercises.map((e) => (e.id === exerciseId ? nextExercise : e)),
        metaByExerciseId: {
          ...prev.metaByExerciseId,
          [exerciseId]: {
            ...meta,
            loadTier: nextTier,
          },
        },
      }
    })
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
          maxWidth: 480,
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
              How are you feeling today?
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 8, marginBottom: 20 }}>
              If you&apos;re good, we go heavy — no need to probe further. If not, we&apos;ll ask what&apos;s off.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={handleFeeling100}
                style={{
                  textAlign: 'left',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.45)',
                  borderRadius: 12,
                  padding: '16px 14px',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>100%</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                  Full weight, full volume
                </div>
              </button>
              <button
                type="button"
                onClick={handleFeelingNot100}
                style={{
                  textAlign: 'left',
                  background: '#1a1a1a',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: '16px 14px',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>Not quite</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                  Let&apos;s figure out what&apos;s off
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={handleSkipDay}
              style={{
                marginTop: 16,
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 13,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Sick or sharp pain — skip today
            </button>
          </>
        )}

        {step === 'regions' && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', marginBottom: 8 }}>
              CHECK-IN
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>
              What&apos;s off?
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 8, marginBottom: 20 }}>
              Answer body parts, not exercises
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {BODY_REGIONS.map((region) => (
                <div
                  key={region.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                    {region.label}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
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
            <p style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#ef4444',
              letterSpacing: '0.1em',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              CHECK-IN
            </p>
            <p style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.75)',
              textAlign: 'center',
              margin: '24px 0',
              lineHeight: 1.5,
            }}>
              No workout today. Rest, hydrate, check back tomorrow.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                width: '100%',
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
              Exercises — tap to swap
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {recommendation.exercises.map((exercise, index) => {
                const meta = recommendation.metaByExerciseId[exercise.id]
                const tier = meta?.loadTier
                const badge = tier ? TIER_BADGE_STYLE[tier] : null
                const hasOptions = Boolean(meta?.options?.length)

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
                      {hasOptions ? (
                        <select
                          value={exercise.catalogExerciseId ?? ''}
                          onChange={(e) => handleSwapExercise(exercise.id, e.target.value)}
                          style={{
                            width: '100%',
                            background: '#111',
                            color: '#fff',
                            border: '0.5px solid rgba(255,255,255,0.15)',
                            borderRadius: 8,
                            padding: '8px 10px',
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          {meta!.options!.map((group) => (
                            <optgroup key={group.tier} label={LOAD_TIER_LABEL[group.tier]}>
                              {group.exercises.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                          {exercise.name}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                        {exercise.sets} × {exercise.reps}
                      </div>
                    </div>
                    {tier && badge && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: badge.color,
                        border: badge.border,
                        background: badge.background,
                        borderRadius: 6,
                        padding: '4px 8px',
                        flexShrink: 0,
                      }}>
                        {LOAD_TIER_LABEL[tier]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <p style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 18,
              lineHeight: 1.4,
            }}>
              Dropdowns only offer this variant or lighter — today&apos;s check-in sets the ceiling.
            </p>
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
