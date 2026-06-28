import { useState, useEffect } from 'react'
import type { WorkoutCategory } from '../types/workout'
import type {
  ActivityEntry,
  ActivityType,
  DayActivity,
  RecommendationResult,
  WorkoutRecommendation,
  WorkoutType,
} from '../types/training'
import type { TodaySummary } from '../utils/workoutSummary'
import type { WeeklyPlanDay } from '../services/recommendationService'
import { ChooseAnotherModal } from './ChooseAnotherModal'
import { AiCoachLayout, useAiCoachChat } from './AiCoachLayout'
import { UserMenu } from './UserMenu'
import { SESSION_DOT_COLORS, SESSION_DISPLAY_LABELS } from '../constants/sessionColors'

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_COLORS = SESSION_DOT_COLORS
const SESSION_LABELS = SESSION_DISPLAY_LABELS

function formatActivityLabels(types: ActivityType[]): string {
  if (types.length === 0) return 'nothing'
  return types.map((type) => SESSION_LABELS[type] ?? type).join(' + ')
}

function toggleType(types: ActivityType[], type: ActivityType): ActivityType[] {
  return types.includes(type) ? types.filter((item) => item !== type) : [...types, type]
}

const ALL_SESSION_TYPES: Array<{ type: ActivityType; label: string }> = [
  { type: 'Push',     label: 'Push' },
  { type: 'Pull',     label: 'Pull' },
  { type: 'Leg',      label: 'Legs' },
  { type: 'Core',     label: 'Core' },
  { type: 'Swim',     label: 'Swim' },
  { type: 'Bike',     label: 'Bike' },
  { type: 'Run',      label: 'Run' },
  { type: 'Walk',     label: 'Walk' },
  { type: 'HIIT',     label: 'HIIT' },
  { type: 'Mobility', label: 'Mobility' },
  { type: 'Rest',     label: 'Rest' },
]

const SEG_MAP: Record<string, string[]> = {
  '0': ['a','b','c','d','e','f'],
  '1': ['b','c'],
  '2': ['a','b','d','e','g'],
  '3': ['a','b','c','d','g'],
  '4': ['b','c','f','g'],
  '5': ['a','c','d','f','g'],
  '6': ['a','c','d','e','f','g'],
  '7': ['a','b','c'],
  '8': ['a','b','c','d','e','f','g'],
  '9': ['a','b','c','d','f','g'],
}

// ─── LED helpers ──────────────────────────────────────────────────────────────

function LedDigit({ char }: { char: string }) {
  const on = SEG_MAP[char] ?? []
  const seg = (name: string, style: React.CSSProperties) => (
    <div
      key={name}
      style={{
        position: 'absolute',
        borderRadius: 2,
        transition: 'background 0.05s, box-shadow 0.05s',
        background: on.includes(name) ? '#dd1515' : 'rgba(100,0,0,0.15)',
        boxShadow: on.includes(name)
          ? '0 0 2px rgba(220,20,20,0.9), 0 0 5px rgba(200,0,0,0.4)'
          : 'none',
        ...style,
      }}
    />
  )
  return (
    <div style={{ position: 'relative', width: 52, height: 90, flexShrink: 0 }}>
      {seg('a', { top: 0,    left: 6, width: 40, height: 7 })}
      {seg('b', { top: 6,    right: 0, width: 7, height: 36 })}
      {seg('c', { bottom: 6, right: 0, width: 7, height: 36 })}
      {seg('d', { bottom: 0, left: 6, width: 40, height: 7 })}
      {seg('e', { bottom: 6, left: 0, width: 7, height: 36 })}
      {seg('f', { top: 6,    left: 0, width: 7, height: 36 })}
      {seg('g', { top: 'calc(50% - 3.5px)', left: 6, width: 40, height: 7 })}
    </div>
  )
}

function LedColon({ lit }: { lit: boolean }) {
  const dot: React.CSSProperties = {
    width: 9, height: 9, borderRadius: '50%',
    background: lit ? '#dd1515' : 'rgba(100,0,0,0.18)',
    boxShadow: lit ? '0 0 2px rgba(220,20,20,0.8)' : 'none',
  }
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', gap: 18, height: 90, width: 22, paddingBottom: 4,
    }}>
      <div style={dot} />
      <div style={dot} />
    </div>
  )
}

// ─── Util helpers ─────────────────────────────────────────────────────────────

function formatMeta(a: ActivityEntry): string {
  const parts: string[] = []
  if (a.durationMinutes) {
    const m = a.durationMinutes
    parts.push(m >= 60 ? `${Math.floor(m/60)}h${m%60>0?` ${m%60}m`:''}` : `${m} min`)
  }
  if (a.distanceMiles) parts.push(`${a.distanceMiles.toFixed(1)} mi`)
  else if (a.distanceMeters) parts.push(`${a.distanceMeters}m`)
  return parts.join(' · ')
}

function isoToWeekday(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

function todayBanner(): string {
  const d = new Date()
  const day = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `TODAY — ${day} ${mon} ${d.getDate()}`
}

function buildLast7(history: DayActivity[]): DayActivity[] {
  const result: DayActivity[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const found = history.find(h => h.date === dateStr)
    result.push(found ?? {
      date: dateStr,
      dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
      activities: [],
    })
  }
  return result
}

function primaryButtonLabel(type: WorkoutType | undefined): string {
  if (!type) return 'Start session'
  if (['Run','Swim','Bike','Walk','HIIT'].includes(type)) return `Log a ${type.toLowerCase()}`
  if (type === 'Mobility') return 'Start mobility'
  if (type === 'Core') return 'Start core'
  if (type === 'Rest') return 'Log rest day'
  return 'Start session'
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HomeScreenProps {
  userEmail?: string
  activityHistory: DayActivity[]
  recommendationReady: boolean
  recommendation: RecommendationResult | null
  todayLogged: boolean
  todaySummary: TodaySummary | null
  tomorrowRecommendation: WorkoutRecommendation | null
  weeklyPlan: WeeklyPlanDay[]
  planOverrides: Record<string, ActivityType[]>
  onSignOut: () => void
  onEditRoutine: () => void
  onUpdateDayActivities: (date: string, types: ActivityType[]) => void
  onSetPlanOverride: (date: string, types: ActivityType[]) => void
  onStartRecommendation: () => void
  onSelectWorkout: (workoutId: WorkoutCategory) => void
  onSelectCardio: (type: WorkoutType) => void
  onSelectTimer: () => void
  onSelectCore: () => void
  onSelectMobility: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HomeScreen(props: HomeScreenProps) {
  return (
    <div style={{
      background: '#0a0a0a',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <HomeScreenTopBar
        userEmail={props.userEmail}
        onSignOut={props.onSignOut}
        onEditRoutine={props.onEditRoutine}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <AiCoachLayout defaultChatVisible>
          <HomeScreenBody {...props} />
        </AiCoachLayout>
      </div>
    </div>
  )
}

function HomeScreenTopBar({
  userEmail,
  onSignOut,
  onEditRoutine,
}: Pick<HomeScreenProps, 'userEmail' | 'onSignOut' | 'onEditRoutine'>) {
  const [clockNow, setClockNow] = useState(new Date())
  const [colonOn, setColonOn] = useState(true)
  useEffect(() => {
    const id = setInterval(() => {
      setClockNow(new Date())
      setColonOn(v => !v)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const h12 = clockNow.getHours() % 12 || 12
  const mins = clockNow.getMinutes()
  const ampm = clockNow.getHours() < 12 ? 'AM' : 'PM'
  const [h0, h1, m0, m1] = [
    String(Math.floor(h12 / 10)),
    String(h12 % 10),
    String(Math.floor(mins / 10)),
    String(mins % 10),
  ]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0 2rem',
      height: 104,
      borderBottom: '0.5px solid rgba(255,255,255,0.07)',
      background: '#000',
      flexShrink: 0,
      gap: '2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <img
          src="/bd-gym-logo.png"
          alt="BusyDad Gym"
          style={{ display: 'block', flexShrink: 0, height: 96, width: 'auto' }}
        />
      </div>
      <div style={{ width: '0.5px', height: 44, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <LedDigit char={h0} />
          <LedDigit char={h1} />
          <LedColon lit={colonOn} />
          <LedDigit char={m0} />
          <LedDigit char={m1} />
          <div style={{
            fontSize: 18, fontWeight: 600,
            color: 'rgba(220,20,20,0.45)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            alignSelf: 'flex-end',
            paddingBottom: 6,
            marginLeft: 4,
          }}>
            {ampm}
          </div>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <UserMenu
          email={userEmail}
          onSignOut={onSignOut}
          onEditRoutine={onEditRoutine}
        />
      </div>
    </div>
  )
}

function HomeScreenBody({
  activityHistory,
  recommendation,
  recommendationReady,
  todayLogged,
  tomorrowRecommendation,
  weeklyPlan,
  planOverrides,
  onUpdateDayActivities,
  onSetPlanOverride,
  onStartRecommendation,
  onSelectWorkout,
  onSelectCardio,
  onSelectTimer,
  onSelectCore,
  onSelectMobility,
}: HomeScreenProps) {
  const { chatVisible, openChat } = useAiCoachChat()
  const [editingDay, setEditingDay] = useState<DayActivity | null>(null)
  const [editTypes, setEditTypes] = useState<ActivityType[]>([])
  const [editingFuture, setEditingFuture] = useState<WeeklyPlanDay | null>(null)
  const [futureTypes, setFutureTypes] = useState<ActivityType[]>([])
  const [chooseOpen, setChooseOpen] = useState(false)
  const [saveToast, setSaveToast] = useState<string | null>(null)

  useEffect(() => {
    if (!saveToast) return
    const timer = window.setTimeout(() => setSaveToast(null), 2000)
    return () => window.clearTimeout(timer)
  }, [saveToast])

  const flashSaved = (message = 'Saved') => setSaveToast(message)

  const openWorkoutPicker = () => setChooseOpen(true)

  const handleStartToday = () => {
    if (recommendation?.primary) {
      onStartRecommendation()
      return
    }
    openWorkoutPicker()
  }

  const openAiChat = () => openChat()

  const openPastEdit = (day: DayActivity) => {
    const types = [...new Set(day.activities.map((activity) => activity.type))]
    setEditTypes(types)
    setEditingDay(day)
  }

  const savePastEdit = () => {
    if (!editingDay) return
    onUpdateDayActivities(editingDay.date, editTypes)
    setEditingDay(null)
    flashSaved()
  }

  const removePastDay = () => {
    if (!editingDay) return
    onUpdateDayActivities(editingDay.date, [])
    setEditingDay(null)
    flashSaved('Removed')
  }

  const openFutureEdit = (day: WeeklyPlanDay) => {
    const override = planOverrides[day.date]
    const types =
      override ??
      (day.displayType ? [day.displayType as ActivityType] : [])
    setFutureTypes(types)
    setEditingFuture(day)
  }

  const saveFutureOverride = () => {
    if (!editingFuture) return
    onSetPlanOverride(editingFuture.date, futureTypes)
    setEditingFuture(null)
    flashSaved()
  }

  const resetFutureToRecommended = () => {
    if (!editingFuture) return
    onSetPlanOverride(editingFuture.date, [])
    setEditingFuture(null)
    flashSaved('Plan reset')
  }

  // ── Data ──
  const last7 = buildLast7(activityHistory)  // today is last7[6]
  const futureDays = weeklyPlan.slice(1, 8)   // excludes today
  const primary = recommendation?.primary
  const todayActivities = activityHistory.at(-1)?.activities ?? []

  // ── Render helpers ──
  const renderDayCard = (day: DayActivity, isToday: boolean) => {
    const label = isoToWeekday(day.date)
    return (
      <div
        key={day.date}
        onClick={() => openPastEdit(day)}
        style={{
          background: isToday ? '#1a1a1a' : '#161616',
          border: `0.5px solid ${isToday ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 9,
          padding: '10px 11px',
          cursor: 'pointer',
          transition: 'all 0.12s',
          minHeight: 72,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <style>{`.day-card:hover { background: #1c1c1c !important; border-color: rgba(255,255,255,0.15) !important; }`}</style>
        <div style={{
          fontSize: 10,
          color: isToday ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 5,
          fontWeight: 600,
        }}>
          {isToday ? 'TODAY' : label}
        </div>

        {day.activities.length > 0 ? day.activities.map((a, i) => (
          <div key={i} style={{ marginTop: i > 0 ? 6 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: SESSION_COLORS[a.type] ?? 'rgba(255,255,255,0.2)',
              }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                {SESSION_LABELS[a.type] ?? a.type}
              </span>
            </div>
            {formatMeta(a) && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
                {formatMeta(a)}
              </div>
            )}
          </div>
        )) : (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)', marginTop: 2 }}>—</div>
        )}

        <div style={{ fontSize: 9, color: 'rgba(239,68,68,0.4)', marginTop: 4 }}>
          ✎ {isToday ? 'edit today' : 'edit'}
        </div>
      </div>
    )
  }

  const renderFutureCard = (day: WeeklyPlanDay) => {
    const overrideTypes = planOverrides[day.date]
    const displayTypes =
      overrideTypes ??
      (day.displayType ? [day.displayType as ActivityType] : [])
    const label = isoToWeekday(day.date)
    return (
      <div
        key={day.date}
        onClick={() => openFutureEdit(day)}
        style={{
          background: '#161616',
          border: '0.5px solid rgba(255,255,255,0.07)',
          borderRadius: 9,
          padding: '10px 11px',
          cursor: 'pointer',
          transition: 'all 0.12s',
          minHeight: 72,
        }}
      >
        <div style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 5,
          fontWeight: 600,
        }}>
          {label}
        </div>
        {displayTypes.length > 0 ? displayTypes.map((type, index) => (
          <div key={`${type}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: index > 0 ? 6 : 0 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: SESSION_COLORS[type] ?? 'rgba(255,255,255,0.2)',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
              {SESSION_LABELS[type] ?? type}
            </span>
          </div>
        )) : (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)', marginTop: 2 }}>—</div>
        )}
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>✎ change</div>
      </div>
    )
  }

  const renderAiPlanCard = () => (
    <button
      type="button"
      key="plan-with-ai"
      onClick={openAiChat}
      style={{
        background: '#6B1C23',
        border: '0.5px solid rgba(255,255,255,0.12)',
        borderRadius: 9,
        padding: '10px 11px',
        cursor: 'pointer',
        transition: 'all 0.12s',
        minHeight: 72,
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 6,
        boxShadow: '0 2px 12px rgba(60,12,18,0.45)',
      }}
    >
      <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.92)', lineHeight: 1 }}>✦</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.95)', lineHeight: 1.25 }}>
        Plan with AI
      </span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>
        open chat →
      </span>
    </button>
  )

  return (
    <>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        minWidth: 0,
        height: '100%',
      }}>

          {/* Last 7 days */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Last 7 days
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>↑ tap to edit</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6 }}>
              {last7.map((day, i) => renderDayCard(day, i === 6))}
            </div>
          </div>

          {/* Today divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{
              fontSize: 11, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
              letterSpacing: '0.1em', whiteSpace: 'nowrap',
            }}>
              {todayBanner()}
            </span>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Today recommendation / logged card */}
          <div style={{
            background: '#161616',
            border: `0.5px solid ${todayLogged ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.09)'}`,
            borderRadius: 12,
            padding: '1.5rem',
          }}>
            {todayLogged ? (
              /* ── Logged state ── */
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(52,211,153,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      ✓ Today logged
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>
                      {todayActivities.length > 0
                        ? todayActivities.map(a => SESSION_LABELS[a.type] ?? a.type).join(' + ')
                        : 'Done'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                    background: 'rgba(16,185,129,0.1)', color: '#34d399',
                    border: '0.5px solid rgba(16,185,129,0.2)',
                  }}>
                    Well done
                  </div>
                </div>

                {todayActivities.length > 0 && (
                  <div style={{
                    background: '#0d0d0d',
                    border: '0.5px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    padding: '11px 14px',
                    marginBottom: 9,
                  }}>
                    {todayActivities.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 6 : 0 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: SESSION_COLORS[a.type] ?? 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                          {SESSION_LABELS[a.type] ?? a.type}
                          {formatMeta(a) ? <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>{formatMeta(a)}</span> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {tomorrowRecommendation && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(59,130,246,0.06)',
                    border: '0.5px solid rgba(59,130,246,0.18)',
                    borderRadius: 8, padding: '10px 14px',
                    fontSize: 13, color: 'rgba(99,179,237,0.9)',
                    marginBottom: '1.125rem',
                  }}>
                    → Tomorrow: {SESSION_LABELS[tomorrowRecommendation.workoutType] ?? tomorrowRecommendation.workoutType}
                    {tomorrowRecommendation.reason && (
                      <span style={{ color: 'rgba(99,179,237,0.55)', marginLeft: 4 }}>— {tomorrowRecommendation.reason.split('.')[0]}</span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={openWorkoutPicker}
                    style={{
                      background: '#ef4444', border: 'none', borderRadius: 7,
                      padding: '10px 22px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Start a workout
                  </button>
                </div>
              </>
            ) : (
              /* ── Recommendation state ── */
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>
                    {primary ? (SESSION_LABELS[primary.type] ?? primary.type) : (recommendationReady ? 'Rest' : '—')}
                  </div>
                  {primary?.bucket === 'Best' && (
                    <div style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                      background: 'rgba(16,185,129,0.1)', color: '#34d399',
                      border: '0.5px solid rgba(16,185,129,0.2)',
                    }}>
                      Best today
                    </div>
                  )}
                </div>

                {primary && (
                  <div style={{
                    background: '#0d0d0d', border: '0.5px solid rgba(255,255,255,0.06)',
                    borderRadius: 8, padding: '11px 14px', marginBottom: 9,
                  }}>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>
                      {primary.reason}
                    </div>
                  </div>
                )}

                {primary && tomorrowRecommendation && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(59,130,246,0.06)',
                    border: '0.5px solid rgba(59,130,246,0.18)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: '1.125rem',
                    fontSize: 13, color: 'rgba(99,179,237,0.9)',
                  }}>
                    → {SESSION_LABELS[primary.type] ?? primary.type} today,{' '}
                    {SESSION_LABELS[tomorrowRecommendation.workoutType] ?? tomorrowRecommendation.workoutType} tomorrow
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleStartToday}
                    style={{
                      background: '#ef4444', border: 'none', borderRadius: 7,
                      padding: '10px 22px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {primary
                      ? primaryButtonLabel(primary.type as WorkoutType)
                      : 'Start a workout'}
                  </button>
                  {primary && (
                    <button
                      type="button"
                      onClick={openWorkoutPicker}
                      style={{
                        background: 'transparent',
                        border: '0.5px solid rgba(255,255,255,0.15)',
                        borderRadius: 7, padding: '10px 22px',
                        color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer',
                      }}
                    >
                      Choose another
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Next 7 days */}
          {futureDays.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Next 7 days
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
                  {chatVisible ? '↑ tap to adjust' : '↑ tap a day to adjust'}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: 6,
                }}
              >
                {(!chatVisible && futureDays.length >= 6
                  ? futureDays.slice(0, 6)
                  : futureDays.slice(0, 7)
                ).map(renderFutureCard)}
                {!chatVisible && renderAiPlanCard()}
              </div>
            </div>
          )}

          {!chatVisible && futureDays.length === 0 && (
            <div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Plan ahead
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
                <div style={{ gridColumn: 'span 1' }}>{renderAiPlanCard()}</div>
              </div>
            </div>
          )}

          {/* Bottom padding */}
          <div style={{ height: '2rem' }} />
      </div>

      {/* ── Past day edit modal ── */}
      {editingDay && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setEditingDay(null)}
        >
          <div
            style={{
              background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '1.375rem', width: 420, maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                Edit {isoToWeekday(editingDay.date)}
              </span>
              <button onClick={() => setEditingDay(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
              {isoToWeekday(editingDay.date)} — logged as:{' '}
              {formatActivityLabels([...new Set(editingDay.activities.map((a) => a.type))])}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>
              Tap one or more — deselect all to clear the day.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: '1rem' }}>
              {ALL_SESSION_TYPES.map(({ type, label }) => {
                const selected = editTypes.includes(type)
                return (
                <button
                  key={type}
                  onClick={() => setEditTypes((prev) => toggleType(prev, type))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 11px',
                    border: `0.5px solid ${selected ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 7,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: selected ? '#fff' : 'rgba(255,255,255,0.7)',
                    background: selected ? 'rgba(239,68,68,0.08)' : '#111',
                  }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: SESSION_COLORS[type] ?? 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  {label}
                </button>
              )})}
            </div>

            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Saves to your account and refreshes recommendations automatically.
            </div>

            <button
              onClick={savePastEdit}
              style={{
                width: '100%', background: '#ef4444', border: 'none',
                borderRadius: 7, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', marginBottom: 8,
              }}
            >
              Update log ({editTypes.length} selected)
            </button>
            <button
              onClick={removePastDay}
              style={{
                width: '100%', background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 7, padding: '11px', color: 'rgba(255,255,255,0.4)',
                fontSize: 14, cursor: 'pointer',
              }}
            >
              Remove this day
            </button>
          </div>
        </div>
      )}

      {/* ── Future day modal ── */}
      {editingFuture && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setEditingFuture(null)}
        >
          <div
            style={{
              background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '1.375rem', width: 420, maxHeight: '85vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                Change {isoToWeekday(editingFuture.date)}
              </span>
              <button onClick={() => setEditingFuture(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
              {isoToWeekday(editingFuture.date)} — planned:{' '}
              {formatActivityLabels(
                planOverrides[editingFuture.date] ??
                  (editingFuture.displayType ? [editingFuture.displayType as ActivityType] : []),
              )}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>
              Tap one or more workout types for this day.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 16 }}>
              {ALL_SESSION_TYPES.map(({ type, label }) => {
                const selected = futureTypes.includes(type)
                return (
                <button
                  key={type}
                  onClick={() => setFutureTypes((prev) => toggleType(prev, type))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 11px',
                    border: `0.5px solid ${selected ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 7,
                    cursor: 'pointer',
                    background: selected ? 'rgba(239,68,68,0.07)' : '#111',
                    color: selected ? '#fff' : 'rgba(255,255,255,0.7)',
                    fontSize: 12,
                    fontWeight: selected ? 600 : 400,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: SESSION_COLORS[type] ?? 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  {label}
                </button>
              )})}
            </div>

            <button
              onClick={saveFutureOverride}
              style={{
                width: '100%', background: '#ef4444',
                border: 'none', borderRadius: 7, padding: '11px',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', marginBottom: 8,
              }}
            >
              Save plan ({futureTypes.length} selected)
            </button>
            <button
              onClick={resetFutureToRecommended}
              style={{
                width: '100%', background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 7, padding: '11px', color: 'rgba(255,255,255,0.4)',
                fontSize: 14, cursor: 'pointer',
              }}
            >
              Use recommended plan
            </button>
          </div>
        </div>
      )}

      {/* ── Choose another modal ── */}
      <ChooseAnotherModal
        open={chooseOpen}
        alternatives={recommendation?.alternatives ?? []}
        onClose={() => setChooseOpen(false)}
        onSelectWorkout={onSelectWorkout}
        onSelectCardio={onSelectCardio}
        onSelectCore={onSelectCore}
        onSelectMobility={onSelectMobility}
        onSelectTimer={onSelectTimer}
      />

      {saveToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            background: '#1a1a1a',
            border: '0.5px solid rgba(52,211,153,0.35)',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            color: '#34d399',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            pointerEvents: 'none',
          }}
        >
          {saveToast}
        </div>
      )}

    </>
  )
}
