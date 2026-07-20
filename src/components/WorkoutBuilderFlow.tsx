import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { CheckIn, RegionStatus } from '../types/checkIn'
import {
  BODY_REGIONS,
  REGION_STATUSES,
  REGION_STATUS_LABELS,
  emptyCheckInRegions,
} from '../types/checkIn'
import type { SessionRow } from '../types/sessionBuilder'
import type { Exercise, WorkoutCategory } from '../types/workout'
import type { LoadTier } from '../data/exerciseCatalog'
import {
  getBuilderCategory,
  PATTERN_LABELS,
  restSecondsForTier,
  toLedgerWorkoutCategory,
  type BuilderCategoryId,
  type PrimaryPattern,
} from '../data/workoutCategories'
import { autoFitToTarget } from '../services/autoFitService'
import {
  buildSessionRows,
  reResolveRemovedPattern,
  sessionRowsToExercises,
} from '../services/sessionBuilderService'
import { estimateSessionMinutes } from '../services/timeEstimateService'
import { sessionVolumeSummary } from '../services/checkInService'
import { getCatalogTier } from '../services/recommendedWorkoutService'
import { getUserProfile } from '../services/userProfileRepository'

type Step = 'time' | 'feeling' | 'regions' | 'skip' | 'editor'

interface WorkoutBuilderFlowProps {
  open: boolean
  categoryId: BuilderCategoryId | null
  onClose: () => void
  onStart: (category: WorkoutCategory, exercises: Exercise[]) => void
}

const LOAD_TIER_LABEL: Record<LoadTier, string> = {
  heavy: 'Heavy',
  moderate: 'Moderate',
  low_impact: 'TRX',
}

const TIER_BADGE: Record<LoadTier, { color: string; border: string; background: string }> = {
  heavy: {
    color: '#ff7a68',
    border: '0.5px solid rgba(239,68,68,0.45)',
    background: 'rgba(227,64,46,0.12)',
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

function equipmentProfile() {
  const profile = getUserProfile()
  return { equipment: profile.equipment, canBench: profile.canBench }
}

export function WorkoutBuilderFlow({
  open,
  categoryId,
  onClose,
  onStart,
}: WorkoutBuilderFlowProps) {
  const [step, setStep] = useState<Step>('time')
  const [timeTarget, setTimeTarget] = useState<number | null>(null)
  const [regions, setRegions] = useState(emptyCheckInRegions)
  const [rows, setRows] = useState<SessionRow[]>([])
  const [removedPatterns, setRemovedPatterns] = useState<PrimaryPattern[]>([])
  const [core, setCore] = useState(true)
  const [mobility, setMobility] = useState(true)
  const [autofitChanges, setAutofitChanges] = useState<string[]>([])
  const [checkInSnapshot, setCheckInSnapshot] = useState<CheckIn | null>(null)

  const category = categoryId ? getBuilderCategory(categoryId) : null

  const estMinutes = useMemo(
    () => estimateSessionMinutes(rows, core, mobility),
    [rows, core, mobility],
  )

  const resetAll = () => {
    setStep('time')
    setTimeTarget(null)
    setRegions(emptyCheckInRegions())
    setRows([])
    setRemovedPatterns([])
    setCore(true)
    setMobility(true)
    setAutofitChanges([])
    setCheckInSnapshot(null)
  }

  // New tile selection restarts the inline flow under the grid.
  useEffect(() => {
    if (!open || !categoryId) return
    setStep('time')
    setTimeTarget(null)
    setRegions(emptyCheckInRegions())
    setRows([])
    setRemovedPatterns([])
    setCore(true)
    setMobility(true)
    setAutofitChanges([])
    setCheckInSnapshot(null)
  }, [categoryId, open])

  if (!open || !categoryId || !category) return null

  const handleClose = () => {
    resetAll()
    onClose()
  }

  const runBuild = (checkIn: CheckIn, target: number | null) => {
    const profile = equipmentProfile()
    const built = buildSessionRows(categoryId, checkIn, profile)
    const fit = autoFitToTarget(built, target, profile)
    setRows(fit.rows)
    setRemovedPatterns(fit.removedPatterns)
    setCore(fit.core)
    setMobility(fit.mobility)
    setAutofitChanges(fit.changes)
    setCheckInSnapshot(checkIn)
    setStep('editor')
  }

  const handleTime = (target: number | null) => {
    setTimeTarget(target)
    if (category.skipCheckIn) {
      const checkIn: CheckIn = { global: '100', regions: emptyCheckInRegions() }
      runBuild(checkIn, target)
      return
    }
    setStep('feeling')
  }

  const handleFeeling100 = () => {
    const checkIn: CheckIn = { global: '100', regions: emptyCheckInRegions() }
    setRegions(emptyCheckInRegions())
    runBuild(checkIn, timeTarget)
  }

  const handleFeelingNot100 = () => {
    setStep('regions')
  }

  const handleBuildFromRegions = () => {
    const checkIn: CheckIn = { global: 'not_100', regions }
    runBuild(checkIn, timeTarget)
  }

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const removeRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      setRemovedPatterns((patterns) =>
        patterns.includes(removed.patternKey) ? patterns : [...patterns, removed.patternKey],
      )
      return next
    })
  }

  const addBack = (pattern: PrimaryPattern) => {
    if (!checkInSnapshot) return
    const row = reResolveRemovedPattern(pattern, categoryId, checkInSnapshot, equipmentProfile())
    if (!row) return
    setRows((prev) => [...prev, row])
    setRemovedPatterns((prev) => prev.filter((p) => p !== pattern))
  }

  const swapExercise = (index: number, catalogId: string) => {
    setRows((prev) => {
      const next = [...prev]
      const row = next[index]
      const option = row.options
        .flatMap((g) => g.exercises)
        .find((e) => e.id === catalogId)
      if (!option) return prev
      const tier = (getCatalogTier(option.id) ?? option.loadTier ?? row.currentTier) as LoadTier
      next[index] = {
        ...row,
        catalogExerciseId: option.id,
        currentName: option.name,
        currentTier: tier,
        suggestedRestSeconds: restSecondsForTier(tier, row.forceTrx),
        autoAdjusted: false,
      }
      return next
    })
  }

  const handleFinalize = () => {
    const ledgerCategory = toLedgerWorkoutCategory(categoryId)
    const exercises = sessionRowsToExercises(rows, ledgerCategory)
    onStart(ledgerCategory, exercises)
    resetAll()
  }

  const cmpLabel = () => {
    if (timeTarget === null) return { text: 'No limit', className: 'none' as const }
    if (estMinutes <= timeTarget) return { text: `Under ${timeTarget}m`, className: 'under' as const }
    return { text: `Over ${timeTarget}m`, className: 'over' as const }
  }
  const cmp = cmpLabel()

  return (
    <section
      id="workout-builder-panel"
      style={{
        marginTop: 28,
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 28,
      }}
    >
        {step === 'time' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff' }}>
                {category.label} — how much time?
              </h2>
              <button type="button" onClick={handleClose} style={ghostBtn}>
                ✕ change
              </button>
            </div>
            <p style={{ color: '#a3a3a3', fontSize: 14, marginTop: 8 }}>
              We&apos;ll auto-fit your session — you can still change anything after.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
              {[30, 45, 60].map((mins) => (
                <button key={mins} type="button" style={choiceBtn} onClick={() => handleTime(mins)}>
                  {mins} min
                </button>
              ))}
              <button type="button" style={choiceBtn} onClick={() => handleTime(null)}>
                No limit
                <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: '#6b6b6f', marginTop: 6 }}>
                  Just show me the total
                </span>
              </button>
            </div>
          </>
        )}

        {step === 'feeling' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff' }}>
                {category.label} — how are you feeling?
              </h2>
              <button type="button" onClick={handleClose} style={ghostBtn}>
                ✕ change
              </button>
            </div>
            <p style={{ color: '#a3a3a3', fontSize: 14, marginTop: 8 }}>
              If you&apos;re good, we go heavy. If not, we&apos;ll ask what&apos;s off.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
              <button type="button" style={{ ...choiceBtn, border: '1px solid rgba(227,64,46,0.45)' }} onClick={handleFeeling100}>
                100%
                <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: '#6b6b6f', marginTop: 6 }}>
                  Full weight, full volume
                </span>
              </button>
              <button type="button" style={choiceBtn} onClick={handleFeelingNot100}>
                Not quite
                <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: '#6b6b6f', marginTop: 6 }}>
                  Let&apos;s figure out what&apos;s off
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStep('skip')}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 16,
                background: 'none',
                border: 'none',
                color: '#6b6b6f',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff' }}>What&apos;s off?</h2>
              <button type="button" onClick={handleClose} style={ghostBtn}>
                ✕ change
              </button>
            </div>
            <div style={{ marginTop: 16 }}>
              {BODY_REGIONS.map((region) => (
                <div
                  key={region.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '13px 0',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', width: 140 }}>
                    {region.label}
                  </span>
                  <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                    {REGION_STATUSES.map((status) => {
                      const selected = regions[region.id] === status
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setRegions((prev) => ({ ...prev, [region.id]: status as RegionStatus }))
                          }
                          style={{
                            flex: 1,
                            borderRadius: 999,
                            padding: '9px 4px',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                            border: selected
                              ? '1px solid #e3402e'
                              : '1px solid rgba(255,255,255,0.14)',
                            background: selected ? 'rgba(227,64,46,0.12)' : '#1c1c1c',
                            color: selected ? '#fff' : '#a3a3a3',
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
              onClick={handleBuildFromRegions}
              style={{
                width: '100%',
                marginTop: 20,
                background: '#e3402e',
                border: 'none',
                borderRadius: 10,
                padding: '15px 26px',
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
            <p style={{ textAlign: 'center', color: '#a3a3a3', fontSize: 15, padding: '20px 0' }}>
              No workout today. Rest, hydrate, check back tomorrow.
            </p>
            <button type="button" onClick={resetAll} style={{ ...ghostBtn, width: '100%' }}>
              Start over
            </button>
          </>
        )}

        {step === 'editor' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff' }}>
                  {category.label}
                </h2>
                <p style={{ color: '#a3a3a3', fontSize: 14, margin: '4px 0 0' }}>
                  {checkInSnapshot
                    ? sessionVolumeSummary(checkInSnapshot)
                    : 'Session ready'}
                </p>
              </div>
              <button type="button" onClick={handleClose} style={ghostBtn}>
                ✕ change
              </button>
            </div>

            {/* Sticky so est. time stays visible while editing lifts / toggles */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 5,
              margin: '0 -28px 4px',
              padding: '12px 28px',
              background: 'rgba(20,20,20,0.94)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#1c1c1c',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 12,
                padding: '14px 20px',
              }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>Est. {estMinutes} min</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: cmp.className === 'under'
                    ? 'rgba(74,222,128,0.12)'
                    : cmp.className === 'over'
                      ? 'rgba(227,64,46,0.12)'
                      : '#202020',
                  color: cmp.className === 'under'
                    ? '#4ade80'
                    : cmp.className === 'over'
                      ? '#ff7a68'
                      : '#6b6b6f',
                }}>
                  {cmp.text}
                </span>
              </div>
              {autofitChanges.length > 0 && (
                <p style={{ fontSize: 12, color: '#6b6b6f', margin: '8px 0 0' }}>
                  Auto-fit: {autofitChanges.join(' · ')}
                </p>
              )}
            </div>

            <p style={segmentLabel}>Warm-up</p>
            <div style={warmupRow}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Dynamic warm-up</div>
                <div style={{ fontSize: 11, color: '#6b6b6f' }}>
                  Arm circles · leg swings · bodyweight squat · glute bridge
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#6b6b6f' }}>🔒 ~5 min</span>
            </div>

            <p style={segmentLabel}>Main lifts — reorder, swap, or remove</p>
            {rows.map((row, index) => {
              const badge = TIER_BADGE[row.currentTier]
              return (
                <div
                  key={`${row.patternKey}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 22px 1fr auto auto 26px',
                    alignItems: 'center',
                    gap: 10,
                    background: '#1c1c1c',
                    borderRadius: 10,
                    padding: '13px 16px',
                    marginBottom: 9,
                    border: row.autoAdjusted ? '1px solid rgba(240,168,60,0.4)' : '1px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveRow(index, -1)}
                      style={reorderBtn}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={index === rows.length - 1}
                      onClick={() => moveRow(index, 1)}
                      style={reorderBtn}
                    >
                      ▼
                    </button>
                  </div>
                  <span style={{ color: '#6b6b6f', fontSize: 13, fontWeight: 600 }}>{index + 1}</span>
                  <div>
                    <select
                      value={row.catalogExerciseId}
                      onChange={(e) => swapExercise(index, e.target.value)}
                      style={{
                        width: '100%',
                        background: '#202020',
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 500,
                        padding: '9px 10px',
                      }}
                    >
                      {row.options.map((group) => (
                        <optgroup key={group.tier} label={LOAD_TIER_LABEL[group.tier]}>
                          {group.exercises.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div style={{ fontSize: 12, color: '#a3a3a3', marginTop: 4 }}>
                      {row.sets} × {row.reps} · rest {row.suggestedRestSeconds}s
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '4px 9px',
                    borderRadius: 999,
                    minWidth: 62,
                    textAlign: 'center',
                    color: badge.color,
                    border: badge.border,
                    background: badge.background,
                  }}>
                    {LOAD_TIER_LABEL[row.currentTier]}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${row.patternLabel}`}
                    disabled={rows.length <= 1}
                    onClick={() => removeRow(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b6b6f',
                      fontSize: 16,
                      cursor: rows.length <= 1 ? 'default' : 'pointer',
                      opacity: rows.length <= 1 ? 0.3 : 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            })}

            {removedPatterns.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {removedPatterns.map((pattern) => (
                  <button
                    key={pattern}
                    type="button"
                    onClick={() => addBack(pattern)}
                    style={{
                      background: '#1c1c1c',
                      border: '1px dashed rgba(255,255,255,0.14)',
                      color: '#a3a3a3',
                      fontSize: 12,
                      padding: '8px 14px',
                      borderRadius: 999,
                      cursor: 'pointer',
                    }}
                  >
                    + {PATTERN_LABELS[pattern]}
                  </button>
                ))}
              </div>
            )}

            {!category.skipCheckIn && (
              <p style={{ color: '#6b6b6f', fontSize: 11, marginBottom: 16 }}>
                Dropdowns only offer this variant or lighter — today&apos;s check-in sets the ceiling.
              </p>
            )}

            <p style={segmentLabel}>Finish</p>
            <ToggleRow
              name="Core"
              sub="~10 min · core finisher"
              checked={core}
              onChange={setCore}
            />
            <ToggleRow
              name="Mobility"
              sub="~10 min · stretch sequence"
              checked={mobility}
              onChange={setMobility}
            />

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="button" onClick={resetAll} style={{ ...ghostBtn, flex: 1 }}>
                Start over
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={rows.length === 0}
                style={{
                  flex: 1,
                  background: '#e3402e',
                  border: 'none',
                  borderRadius: 10,
                  padding: '15px 20px',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: rows.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: rows.length === 0 ? 0.4 : 1,
                }}
              >
                Finalize &amp; start
              </button>
            </div>
          </>
        )}
    </section>
  )
}

function ToggleRow({
  name,
  sub,
  checked,
  onChange,
}: {
  name: string
  sub: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#1c1c1c',
      borderRadius: 10,
      padding: '13px 16px',
      marginBottom: 9,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 12, color: '#6b6b6f', marginTop: 2 }}>{sub}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 42,
          height: 24,
          borderRadius: 999,
          border: checked ? '1px solid #e3402e' : '1px solid rgba(255,255,255,0.14)',
          background: checked ? 'rgba(227,64,46,0.12)' : '#202020',
          position: 'relative',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          width: 16,
          height: 16,
          borderRadius: '50%',
          top: 3,
          left: checked ? 22 : 3,
          background: checked ? '#e3402e' : '#a3a3a3',
          transition: 'left 0.15s',
        }} />
      </button>
    </div>
  )
}

const ghostBtn: CSSProperties = {
  background: '#1c1c1c',
  border: '1px solid rgba(255,255,255,0.14)',
  color: '#a3a3a3',
  fontSize: 12,
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
}

const choiceBtn: CSSProperties = {
  background: '#1c1c1c',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 14,
  color: '#f5f5f4',
  fontSize: 16,
  fontWeight: 700,
  padding: '24px 16px',
  textAlign: 'center',
  cursor: 'pointer',
}

const segmentLabel: CSSProperties = {
  color: '#6b6b6f',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: '20px 0 10px',
}

const warmupRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: '#1c1c1c',
  borderRadius: 10,
  padding: '13px 16px',
  marginBottom: 9,
}

const reorderBtn: CSSProperties = {
  background: '#202020',
  border: '1px solid rgba(255,255,255,0.14)',
  color: '#a3a3a3',
  width: 24,
  height: 18,
  borderRadius: 4,
  fontSize: 10,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
}
