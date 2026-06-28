import { useState, useEffect, useRef, useCallback } from 'react'
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

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_COLORS: Record<string, string> = {
  Push:     '#D85A30',
  Pull:     '#7F77DD',
  Leg:      '#1D9E75',
  Core:     '#7F77DD',
  Swim:     '#378ADD',
  Bike:     '#BA7517',
  Run:      '#D4537E',
  Walk:     '#3B6D11',
  Mobility: '#0F6E56',
  Rest:     'rgba(255,255,255,0.2)',
  Other:    'rgba(255,255,255,0.2)',
}

const SESSION_LABELS: Record<string, string> = {
  Push: 'Push', Pull: 'Pull', Leg: 'Legs', Core: 'Core',
  Swim: 'Swim', Bike: 'Bike', Run: 'Run', Walk: 'Walk',
  Mobility: 'Mobility', Rest: 'Rest', Other: 'Other',
}

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

// ─── Chat types ───────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  text: string
  chips?: string[]
}

const INITIAL_MESSAGES: ChatMessage[] = [{
  id: 'init',
  role: 'ai',
  text: "Strong week. What does next week look like?\nAny days that are tight?",
  chips: ["Monday is busy", "Travelling Thu–Fri", "Add a run", "Feeling tired", "Move Push to Wed"],
}]

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
  if (['Run','Swim','Bike','Walk'].includes(type)) return `Log a ${type.toLowerCase()}`
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

export function HomeScreen({
  userEmail,
  activityHistory,
  recommendation,
  recommendationReady,
  todayLogged,
  tomorrowRecommendation,
  weeklyPlan,
  planOverrides,
  onSignOut,
  onUpdateDayActivities,
  onSetPlanOverride,
  onStartRecommendation,
  onSelectWorkout,
  onSelectCardio,
  onSelectTimer,
  onSelectCore,
  onSelectMobility,
}: HomeScreenProps) {
  // ── Clock ──
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

  // ── Chat ──
  const [chatVisible, setChatVisible] = useState(true)
  const [chatWidth, setChatWidth] = useState(360)
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [chatInput, setChatInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return
    setMessages(m => [...m, { id: Date.now().toString(), role: 'user', text: text.trim() }])
    setChatInput('')
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages(m => [...m, {
        id: (Date.now()+1).toString(),
        role: 'ai',
        text: "Got it — I'll factor that in when the AI planning feature is ready. For now you can adjust any day directly by tapping it.",
      }])
    }, 1500)
  }, [])

  // ── Resize ──
  const resizing = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    resizing.current = true
    startX.current = e.clientX
    startW.current = chatWidth
    e.preventDefault()
  }, [chatWidth])
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return
      const newW = Math.max(260, Math.min(580, startW.current + (startX.current - e.clientX)))
      setChatWidth(newW)
    }
    const onUp = () => { resizing.current = false }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  // ── Modals ──
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

  const openAiChat = () => setChatVisible(true)

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
        background: '#ef4444',
        border: '0.5px solid rgba(255,255,255,0.2)',
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
        boxShadow: '0 2px 12px rgba(239,68,68,0.25)',
      }}
    >
      <span style={{ fontSize: 18, color: '#fff', lineHeight: 1 }}>✦</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>
        Plan with AI
      </span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em' }}>
        open chat →
      </span>
    </button>
  )

  return (
    <div style={{
      background: '#0a0a0a',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── Top bar ── */}
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
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, background: '#ef4444', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="10" width="4" height="4" rx="1" fill="white"/>
              <rect x="18" y="10" width="4" height="4" rx="1" fill="white"/>
              <rect x="6" y="9" width="12" height="6" rx="1" fill="white"/>
              <rect x="5" y="7" width="2" height="10" rx="1" fill="white"/>
              <rect x="17" y="7" width="2" height="10" rx="1" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
              BusyDad Gym
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', marginTop: 2 }}>
              Efficiency + Intelligence
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '0.5px', height: 44, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

        {/* Clock */}
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

        {/* Nav */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {userEmail && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{userEmail}</span>
          )}
          <button
            onClick={onSignOut}
            style={{
              background: 'transparent',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 5,
              padding: '4px 10px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Main scrollable area ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          minWidth: 0,
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

        {/* ── Resize handle ── */}
        {chatVisible && (
          <div
            onMouseDown={onResizeMouseDown}
            style={{
              width: 4,
              background: 'transparent',
              cursor: 'col-resize',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(239,68,68,0.3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          />
        )}

        {/* ── Chat panel ── */}
        {chatVisible && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            background: '#141414',
            borderLeft: '0.5px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
            width: chatWidth,
            minWidth: 260,
            maxWidth: 580,
          }}>
            {/* Chat header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '0.5px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#181818',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Plan with AI</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                  Knows your history · updates your plan
                </div>
              </div>
              <button
                onClick={() => setChatVisible(false)}
                style={{
                  background: 'none',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 5,
                  padding: '3px 8px',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                → hide
              </button>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.875rem',
            }}
              className="chat-scroll"
            >
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'ai' && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', marginBottom: 2 }}>
                      AI COACH
                    </div>
                  )}
                  <div style={{
                    background: msg.role === 'ai' ? '#1e1e1e' : 'rgba(239,68,68,0.1)',
                    border: `0.5px solid ${msg.role === 'ai' ? 'rgba(255,255,255,0.09)' : 'rgba(239,68,68,0.2)'}`,
                    borderRadius: msg.role === 'ai' ? '0 10px 10px 10px' : '10px 0 10px 10px',
                    padding: '10px 13px',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.55,
                    maxWidth: msg.role === 'ai' ? '94%' : '90%',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.text}
                  </div>
                  {msg.chips && msg.chips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      {msg.chips.map(chip => (
                        <button
                          key={chip}
                          onClick={() => sendMessage(chip)}
                          style={{
                            fontSize: 11,
                            padding: '6px 12px',
                            border: '0.5px solid rgba(255,255,255,0.1)',
                            borderRadius: 20,
                            color: 'rgba(255,255,255,0.4)',
                            background: '#1a1a1a',
                            cursor: 'pointer',
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', marginBottom: 2 }}>
                    AI COACH
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '10px 13px',
                    background: '#1e1e1e',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: '0 10px 10px 10px',
                  }}>
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.3)',
                          animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '1rem 1.25rem',
              borderTop: '0.5px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
              background: '#141414',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
            }}>
              <textarea
                ref={textareaRef}
                value={chatInput}
                onChange={e => {
                  setChatInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(chatInput)
                  }
                }}
                placeholder="Tell me about your week..."
                rows={1}
                style={{
                  flex: 1,
                  background: '#1e1e1e',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  padding: '10px 13px',
                  fontSize: 13,
                  color: '#fff',
                  resize: 'none',
                  outline: 'none',
                  minHeight: 40,
                  maxHeight: 100,
                  lineHeight: 1.4,
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => sendMessage(chatInput)}
                style={{
                  background: '#ef4444', border: 'none', borderRadius: 7,
                  width: 38, height: 38, color: '#fff', fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ↑
              </button>
            </div>
          </div>
        )}
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

      {/* Keyframes injected globally */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .chat-scroll::-webkit-scrollbar { width: 3px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  )
}
