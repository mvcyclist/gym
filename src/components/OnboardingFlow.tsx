import { useMemo, useState, type ReactNode } from 'react'
import type { ActivityType } from '../types/training'
import { SESSION_DOT_COLORS, SESSION_DISPLAY_LABELS } from '../constants/sessionColors'
import {
  CARDIO_OPTIONS,
  EQUIPMENT_OPTIONS,
  needsBenchClarifier,
  type CardioModalityKey,
  type EquipmentKey,
  type OnboardingStep,
  type UserProfile,
} from '../types/userProfile'
import {
  formatExerciseList,
  generateWorkoutTemplates,
} from '../services/workoutGeneratorService'
import {
  defaultTemplateSources,
  getExercisesForSource,
  hasAnyStrengthHistory,
  SOURCE_LABELS,
  CYCLE_ORDER,
  isSourceAvailable,
} from '../services/workoutTemplateService'
import type { StrengthTemplateKey, TemplateSource } from '../types/userProfile'
import {
  generateWeeklyPlan,
  weeklyPlanWithDayLabels,
} from '../services/weeklyPlanFromProfile'
import { completeOnboarding, saveOnboardingDraft, cancelEditRoutine, isEditingRoutine } from '../services/onboardingService'

const RED = '#ef4444'

interface OnboardingFlowProps {
  initialProfile: UserProfile
  onComplete: () => void
  onCancel?: () => void
}

function cardioKeyToActivity(key: Exclude<CardioModalityKey, 'none'>): ActivityType {
  const map: Record<Exclude<CardioModalityKey, 'none'>, ActivityType> = {
    swim: 'Swim',
    bike: 'Bike',
    run: 'Run',
    walk: 'Walk',
    hiit: 'HIIT',
  }
  return map[key]
}

export function OnboardingFlow({ initialProfile, onComplete, onCancel }: OnboardingFlowProps) {
  const isEditMode = isEditingRoutine(initialProfile)
  const [step, setStep] = useState<OnboardingStep>(initialProfile.onboardingStep ?? 1)
  const [equipment, setEquipment] = useState<EquipmentKey[]>(
    initialProfile.onboardingDraft?.equipment ?? initialProfile.equipment,
  )
  const [canBench, setCanBench] = useState<boolean | null>(
    initialProfile.onboardingDraft?.canBench ?? initialProfile.canBench,
  )
  const [cardioModalities, setCardioModalities] = useState<CardioModalityKey[]>(
    initialProfile.onboardingDraft?.cardioModalities ?? initialProfile.cardioModalities,
  )
  const [wantsMobility, setWantsMobility] = useState(
    initialProfile.onboardingDraft?.wantsMobility ?? initialProfile.wantsMobility,
  )
  const [wantsCore, setWantsCore] = useState(
    initialProfile.onboardingDraft?.wantsCore ?? initialProfile.wantsCore,
  )
  const [templateSources, setTemplateSources] = useState<Partial<Record<StrengthTemplateKey, TemplateSource>>>(
    () => initialProfile.templateSources ?? {},
  )

  const showBenchClarifier = needsBenchClarifier(equipment)

  const draftProfile = useMemo(
    (): UserProfile => ({
      equipment,
      canBench: showBenchClarifier ? canBench : null,
      cardioModalities,
      wantsMobility,
      wantsCore,
      onboardingComplete: false,
      onboardingStep: step,
    }),
    [canBench, cardioModalities, equipment, showBenchClarifier, step, wantsCore, wantsMobility],
  )

  const templates = useMemo(() => generateWorkoutTemplates(draftProfile), [draftProfile])

  const previewProfile = useMemo(
    (): UserProfile => ({
      ...draftProfile,
      generatedTemplates: templates,
      templateSources,
    }),
    [draftProfile, templates, templateSources],
  )

  const strengthCards = useMemo(
    () =>
      (['push', 'pull', 'leg', 'core'] as const).map((category) => {
        const source = templateSources[category] ?? defaultTemplateSources(previewProfile)[category] ?? 'generated'
        const exercises = getExercisesForSource(category, source, previewProfile)
        return { category, source, exercises }
      }),
    [previewProfile, templateSources],
  )
  const weeklyPlan = useMemo(
    () =>
      weeklyPlanWithDayLabels(
        generateWeeklyPlan({ ...draftProfile, programType: initialProfile.programType }),
      ),
    [draftProfile, initialProfile.programType],
  )

  const persistStep = (nextStep: OnboardingStep) => {
    if (!isEditMode) {
      saveOnboardingDraft({
        ...initialProfile,
        ...draftProfile,
        onboardingStep: nextStep,
        onboardingDraft: {
          equipment,
          canBench: showBenchClarifier ? canBench : null,
          cardioModalities,
          wantsMobility,
          wantsCore,
        },
      })
    }
    setStep(nextStep)
  }

  const handleCancel = () => {
    if (!isEditMode) return
    cancelEditRoutine()
    onCancel?.()
  }

  const toggleEquipment = (key: EquipmentKey) => {
    setEquipment((current) => {
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
      if (!needsBenchClarifier(next)) setCanBench(null)
      return next
    })
  }

  const toggleCardio = (key: CardioModalityKey) => {
    setCardioModalities((current) => {
      if (key === 'none') return ['none']
      const withoutNone = current.filter((item) => item !== 'none')
      return withoutNone.includes(key)
        ? withoutNone.filter((item) => item !== key)
        : [...withoutNone, key]
    })
  }

  const step1Valid = equipment.length > 0 && (!showBenchClarifier || canBench !== null)

  const handleFinish = () => {
    const resolvedSources = {
      ...defaultTemplateSources({ ...draftProfile, generatedTemplates: templates }),
      ...templateSources,
    }
    completeOnboarding(
      {
        ...initialProfile,
        ...draftProfile,
        canBench: showBenchClarifier ? canBench : null,
        templateSources: resolvedSources,
      },
      { templateSources: resolvedSources },
    )
    onComplete()
  }

  const cycleStrengthSource = (category: StrengthTemplateKey) => {
    const current = templateSources[category] ?? defaultTemplateSources(previewProfile)[category] ?? 'generated'
    const currentIndex = CYCLE_ORDER.indexOf(current)
    for (let offset = 1; offset <= CYCLE_ORDER.length; offset += 1) {
      const candidate = CYCLE_ORDER[(currentIndex + offset) % CYCLE_ORDER.length]
      if (isSourceAvailable(category, candidate, previewProfile)) {
        setTemplateSources((prev) => ({ ...prev, [category]: candidate }))
        return
      }
    }
  }

  const selectedCardio = cardioModalities.filter(
    (key): key is Exclude<CardioModalityKey, 'none'> => key !== 'none',
  )

  return (
    <div style={{
      background: '#0a0a0a',
      color: '#fff',
      height: '100dvh',
      maxHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.06)', zIndex: 100 }}>
        <div style={{ height: '100%', width: `${step * 25}%`, background: RED, transition: 'width 0.4s ease' }} />
      </div>

      <nav style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        background: '#000',
        marginTop: 3,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/bd-gym-logo.png" alt="" width={36} height={36} style={{ mixBlendMode: 'screen' }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>BusyDad Gym</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          Step {step} of 4
        </span>
        {isEditMode && (
          <button
            type="button"
            onClick={handleCancel}
            style={{
              marginLeft: 16,
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.35)',
              fontSize: 13,
              cursor: 'pointer',
              padding: '6px 4px',
            }}
          >
            Keep current routine
          </button>
        )}
      </nav>

      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        justifyContent: 'center',
        padding: '3rem 2rem',
      }}>
        <div style={{ width: '100%', maxWidth: 860 }}>
          {step === 1 && (
            <>
              <ScreenHeader
                label={isEditMode ? 'Edit routine — Equipment' : 'Step 1 of 4 — Equipment'}
                heading={<>What do you have to <em style={{ color: RED, fontStyle: 'normal' }}>work with?</em></>}
                sub={isEditMode
                  ? "Update what's available. Changes apply only if you finish all four steps."
                  : "Select everything available to you. We'll build your routine around what you have — nothing else."}
              />
              <OptionGrid>
                {EQUIPMENT_OPTIONS.map((option) => (
                  <SelectCard
                    key={option.key}
                    selected={equipment.includes(option.key)}
                    onClick={() => toggleEquipment(option.key)}
                    icon={option.icon}
                    name={option.name}
                    description={option.description}
                  />
                ))}
              </OptionGrid>
              {showBenchClarifier && (
                <div style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '0.5px solid rgba(239,68,68,0.2)',
                  borderRadius: 10,
                  padding: '1.25rem 1.5rem',
                  marginBottom: '2rem',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Can you bench press?</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 12, lineHeight: 1.5 }}>
                    You have a barbell and bench but no rack. Do you have a sawhorse, pins, or someone to lift off for you?
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <ClarifierButton selected={canBench === true} onClick={() => setCanBench(true)}>
                      Yes, I'm set up to bench
                    </ClarifierButton>
                    <ClarifierButton selected={canBench === false} onClick={() => setCanBench(false)}>
                      No — floor press only
                    </ClarifierButton>
                  </div>
                </div>
              )}
              <ButtonRow>
                <PrimaryButton disabled={!step1Valid} onClick={() => persistStep(2)}>
                  Next — Cardio →
                </PrimaryButton>
              </ButtonRow>
            </>
          )}

          {step === 2 && (
            <>
              <ScreenHeader
                label="Step 2 of 4 — Cardio"
                heading={<>What cardio do you <em style={{ color: RED, fontStyle: 'normal' }}>actually do?</em></>}
                sub="Pick what you do regularly. We'll slot it into your weekly plan alongside your strength sessions."
              />
              <OptionGrid>
                {CARDIO_OPTIONS.map((option) => (
                  <SelectCard
                    key={option.key}
                    selected={cardioModalities.includes(option.key)}
                    onClick={() => toggleCardio(option.key)}
                    icon={option.icon}
                    name={option.name}
                    description={option.description}
                    compact
                  />
                ))}
              </OptionGrid>
              <ButtonRow>
                <BackButton onClick={() => persistStep(1)}>← Back</BackButton>
                <PrimaryButton onClick={() => persistStep(3)}>Generate my routine →</PrimaryButton>
                <SkipButton onClick={() => { setCardioModalities([]); persistStep(3) }}>Skip</SkipButton>
              </ButtonRow>
            </>
          )}

          {step === 3 && (
            <>
              <ScreenHeader
                label="Step 3 of 4 — Your routine"
                heading={<>Built around <em style={{ color: RED, fontStyle: 'normal' }}>what you have.</em></>}
                sub="Four strength sessions plus your cardio. We’ll use your logged workouts when available — tap shuffle to try other sets."
              />
              {hasAnyStrengthHistory() && (
                <div style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '0.5px solid rgba(239,68,68,0.2)',
                  borderRadius: 10,
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.5,
                }}>
                  Found existing workout history — your last Push/Pull/Leg/Core sessions are selected by default. Your logs are untouched.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '2.5rem' }}>
                {strengthCards.map(({ category, source, exercises }) => (
                  <StrengthRoutineCard
                    key={category}
                    category={category}
                    source={source}
                    exercises={formatExerciseList(exercises)}
                    count={`${exercises.length} exercises`}
                    onShuffle={() => cycleStrengthSource(category)}
                  />
                ))}
                {selectedCardio.map((key) => (
                  <RoutineCard
                    key={key}
                    type={cardioKeyToActivity(key)}
                    exercises="Your preferred intervals or sessions"
                    count="Cardio day"
                    cardioNote
                  />
                ))}
              </div>
              <ButtonRow>
                <BackButton onClick={() => persistStep(2)}>← Back</BackButton>
                <PrimaryButton onClick={() => persistStep(4)}>Looks good →</PrimaryButton>
              </ButtonRow>
            </>
          )}

          {step === 4 && (
            <>
              <ScreenHeader
                label="Step 4 of 4 — Your week"
                heading={<>Your week, <em style={{ color: RED, fontStyle: 'normal' }}>sorted.</em></>}
                sub="Strength, cardio, and recovery already balanced."
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: '2rem' }}>
                {weeklyPlan.map((day) => (
                  <div key={day.dayLabel} style={{
                    background: '#111',
                    border: '0.5px solid rgba(255,255,255,0.07)',
                    borderRadius: 10,
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 7,
                  }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>{day.dayLabel}</span>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: SESSION_DOT_COLORS[day.type] }} />
                    <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{SESSION_DISPLAY_LABELS[day.type]}</span>
                    {day.meta && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>{day.meta}</span>}
                  </div>
                ))}
              </div>
              <AddonDivider />
              <AddonCard icon="🧘" name="Mobility sessions" description="10–15 min on cardio or rest days." selected={wantsMobility} onToggle={() => setWantsMobility((v) => !v)} />
              <AddonCard icon="⚡" name="Core reminders" description="Nudge to add core after Push or Pull." selected={wantsCore} onToggle={() => setWantsCore((v) => !v)} />
              <div style={{ marginTop: '2rem' }}>
                <ButtonRow>
                  <BackButton onClick={() => persistStep(3)}>← Back</BackButton>
                  <PrimaryButton onClick={handleFinish}>Start training →</PrimaryButton>
                </ButtonRow>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ScreenHeader({ label, heading, sub }: { label: string; heading: ReactNode; sub: string }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.7)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: '0.75rem' }}>{label}</div>
      <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.08, marginBottom: '0.75rem' }}>{heading}</h1>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 520 }}>{sub}</p>
    </div>
  )
}

function OptionGrid({ children }: { children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '2.5rem' }}>{children}</div>
}

function SelectCard({ selected, onClick, icon, name, description, compact }: {
  selected: boolean; onClick: () => void; icon: string; name: string; description: string; compact?: boolean
}) {
  return (
    <button type="button" onClick={onClick} style={{
      background: selected ? 'rgba(239,68,68,0.06)' : '#111',
      border: `0.5px solid ${selected ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 10, padding: '1.25rem 1.375rem', cursor: 'pointer', display: 'flex',
      alignItems: compact ? 'center' : 'flex-start', gap: 14, position: 'relative', textAlign: 'left', color: '#fff',
    }}>
      <span style={{ position: 'absolute', top: 12, right: 12, width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${selected ? RED : 'rgba(255,255,255,0.15)'}`, background: selected ? RED : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>{selected ? '✓' : ''}</span>
      <span style={{ fontSize: compact ? 26 : 24, flexShrink: 0 }}>{icon}</span>
      <span>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.45 }}>{description}</div>
      </span>
    </button>
  )
}

function StrengthRoutineCard({
  category,
  source,
  exercises,
  count,
  onShuffle,
}: {
  category: StrengthTemplateKey
  source: TemplateSource
  exercises: string
  count: string
  onShuffle: () => void
}) {
  const activityType = category === 'leg' ? 'Leg' : (category.charAt(0).toUpperCase() + category.slice(1)) as 'Push' | 'Pull' | 'Core'
  return (
    <div style={{
      background: '#111',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '1.25rem 1.375rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 3, background: SESSION_DOT_COLORS[activityType] }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{SESSION_DISPLAY_LABELS[activityType]}</div>
            <button
              type="button"
              onClick={onShuffle}
              title="Try another exercise set"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                padding: '4px 8px',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              ↻ Shuffle
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.55)', marginBottom: 6 }}>{SOURCE_LABELS[source]}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>{exercises}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{count}</div>
        </div>
      </div>
    </div>
  )
}

function RoutineCard({ type, exercises, count, cardioNote }: { type: ActivityType; exercises: string; count: string; cardioNote?: boolean }) {
  return (
    <div style={{ background: '#111', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '1.25rem 1.375rem', display: 'flex', gap: 14 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 3, background: SESSION_DOT_COLORS[type] }} />
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>{SESSION_DISPLAY_LABELS[type]}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>{exercises}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{count}</div>
        {cardioNote && <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.5)', marginTop: 4, fontStyle: 'italic' }}>Cardio — tracking support coming soon</div>}
      </div>
    </div>
  )
}

function ButtonRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{children}</div>
}

function PrimaryButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={{
      background: disabled ? 'rgba(239,68,68,0.25)' : RED, border: 'none', borderRadius: 8,
      padding: '12px 28px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
    }}>{children}</button>
  )
}

function BackButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '12px 20px', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer' }}>{children}</button>
}

function SkipButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer', padding: '10px 8px', marginLeft: 4 }}>{children}</button>
}

function ClarifierButton({ children, selected, onClick }: { children: ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: '9px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer',
      border: `0.5px solid ${selected ? RED : 'rgba(255,255,255,0.15)'}`,
      background: selected ? RED : 'transparent', color: selected ? '#fff' : 'rgba(255,255,255,0.6)',
    }}>{children}</button>
  )
}

function AddonDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
      <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.07)' }} />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>Recommended add-ons</span>
      <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

function AddonCard({ icon, name, description, selected, onToggle }: {
  icon: string; name: string; description: string; selected: boolean; onToggle: () => void
}) {
  return (
    <button type="button" onClick={onToggle} style={{
      width: '100%', background: selected ? 'rgba(239,68,68,0.05)' : '#111',
      border: `0.5px solid ${selected ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 10, padding: '1.125rem 1.375rem', display: 'flex', alignItems: 'center', gap: 16,
      cursor: 'pointer', marginBottom: 8, textAlign: 'left', color: '#fff',
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.45 }}>{description}</div>
      </span>
      <div style={{ width: 40, height: 22, background: selected ? RED : 'rgba(255,255,255,0.1)', borderRadius: 11, position: 'relative' }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: 3, transform: selected ? 'translateX(18px)' : 'none', transition: 'transform 0.2s' }} />
      </div>
    </button>
  )
}
